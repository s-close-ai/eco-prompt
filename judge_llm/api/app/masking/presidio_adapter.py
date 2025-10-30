# judge_llm/api/app/masking/presidio_adapter.py
from __future__ import annotations
import os, re
from typing import List
from presidio_analyzer import AnalyzerEngine, RecognizerResult
from presidio_analyzer.recognizer_registry import RecognizerRegistry
from presidio_analyzer.nlp_engine import SpacyNlpEngine
from presidio_anonymizer import AnonymizerEngine, OperatorConfig
from dotenv import load_dotenv
from .regex_rules import make_all_default

load_dotenv()

ADDRESS_POLICY = os.getenv("ADDRESS_POLICY", "FULL").upper().strip()      # FULL | CITY_GU | PROVINCE_ONLY
EMAIL_POLICY   = os.getenv("EMAIL_POLICY", "FULL").upper().strip()        # FULL | KEEP_DOMAIN

_RE_ADDR_HEAD = re.compile(
    r"^(?P<prov>(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|"
    r"경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도))"
    r"(?:\s*(?P<city>(?:[가-힣A-Za-z0-9]{1,10})시))?"
    r"(?:\s*(?P<gu>(?:[가-힣A-Za-z0-9]{1,10})(?:구|군)))?"
)

_AT_DOT = (
    (re.compile(r"\(at\)",  re.I), "@"),
    (re.compile(r"\[at\]",  re.I), "@"),
    (re.compile(r"\(dot\)", re.I), "."),
    (re.compile(r"\[dot\]", re.I), "."),
)
_RX_EMAIL_DOMAIN = re.compile(r"@([A-Za-z0-9\.\-]+\.[A-Za-z]{2,24})$")

def _mask_address_with_policy(orig: str) -> str:
    if ADDRESS_POLICY == "FULL":
        return "<ADDRESS>"
    m = _RE_ADDR_HEAD.search(orig.strip())
    if not m:
        return "<ADDRESS>"
    prov = m.group("prov") or ""
    city = m.group("city") or ""
    gu   = m.group("gu") or ""
    head = " ".join([x for x in (prov, city, gu) if x])
    if ADDRESS_POLICY == "PROVINCE_ONLY":
        return f"{prov} <ADDR_DETAIL>" if prov else "<ADDRESS>"
    return f"{head} <ADDR_DETAIL>" if head else "<ADDRESS>"

def _normalize_email_obfuscation(s: str) -> str:
    out = s
    for rx, rep in _AT_DOT:
        out = rx.sub(rep, out)
    return out

def _mask_email_with_policy(orig: str) -> str:
    """이메일 마스킹 정책 적용: @앞은 <EMAIL>, 뒤는 도메인 그대로"""
    if EMAIL_POLICY == "FULL":
        return "<EMAIL>"
    norm = _normalize_email_obfuscation(orig).strip().strip(",;)]}>")

    # 완전 이메일 구조 찾기
    if "@" not in norm:
        return "<EMAIL>"
    try:
        local, domain = norm.split("@", 1)
        domain = domain.strip()
        # 도메인 유효성 검사
        if not re.match(r"^[A-Za-z0-9\.\-]+\.[A-Za-z]{2,24}$", domain):
            return "<EMAIL>"
        return f"<EMAIL>@{domain}"
    except ValueError:
        return "<EMAIL>"


class PresidioAdapter:
    def __init__(self, mode: str = "conservative"):
        self.mode = mode
        empty_registry = RecognizerRegistry(recognizers=[])
        nlp_engine = SpacyNlpEngine(models=[{"lang_code": "ko", "model_name": "en_core_web_lg"}])
        self.analyzer = AnalyzerEngine(registry=empty_registry, nlp_engine=nlp_engine)

        for r in make_all_default():
            r.supported_language = "ko"
            self.analyzer.registry.add_recognizer(r)

        self.anonymizer = AnonymizerEngine()
        self.operators = {
            "KR_PHONE_NUMBER": OperatorConfig("replace", {"new_value": "<PHONE>"}),
            "KR_RRN":          OperatorConfig("replace", {"new_value": "<RRN>"}),
            "KR_ADDRESS":      OperatorConfig("replace", {"new_value": "<ADDRESS>"}),  # (실제는 수동치환)
            "EMAIL_ADDRESS":   OperatorConfig("replace", {"new_value": "<EMAIL>"}),    # (실제는 수동치환)
            "CREDIT_CARD":     OperatorConfig("replace", {"new_value": "<CARD>"}),
            "SECRET_KEY":      OperatorConfig("replace", {"new_value": "<SECRET>"}),
        }

    def anonymize(self, text: str, lang: str = "ko") -> str:
        # 1) 주소/이메일만 먼저 '원문 기준'으로 탐지
        addr_mail = self.analyzer.analyze(
            text=text, language=lang, entities=["KR_ADDRESS", "EMAIL_ADDRESS"]
        )

        masked = text

        # 2) 주소/이메일을 '하나의 리스트'로 합쳐서 start 내림차순으로 한 번에 치환
        #    (이전: 주소 먼저, 이메일 나중 → 인덱스 이동 발생 가능)
        def _replace_span(s: str, start: int, end: int, repl: str) -> str:
            return s[:start] + repl + s[end:]

        for r in sorted(addr_mail, key=lambda x: x.start, reverse=True):
            span = masked[r.start:r.end]
            if r.entity_type == "KR_ADDRESS":
                repl = _mask_address_with_policy(span)
            else:  # EMAIL_ADDRESS
                repl = _mask_email_with_policy(span)
            masked = _replace_span(masked, r.start, r.end, repl)

        # 3) 남은 엔터티(폰/주민/카드/시크릿)를 '마스킹 후 문자열'에서 재탐지/마스킹
        others = self.analyzer.analyze(
            text=masked,
            language=lang,
            entities=["KR_PHONE_NUMBER", "KR_RRN", "CREDIT_CARD", "SECRET_KEY"]
        )
        if others:
            masked = self.anonymizer.anonymize(text=masked, analyzer_results=others, operators=self.operators).text

        return masked


if __name__ == "__main__":
    p = PresidioAdapter()
    sample = (
        "이름: 홍길동 / 연락처: 010-1234-5678 / 주민: 900101-1234567 / "
        "주소: 서울특별시 강남구 역삼동 테헤란로 212 (06221) / "
        "이메일: john.doe(at)example(dot)com / 카드: 4111-1111-1111-1111 / "
        "AWS 키: AKIAABCD1234EFGH5678 / JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb"
        "이름: 김재희 / 연락처: 010-9502-2067 / 주민: 950202-1234567 / "
        "주소: 서울특별시 강남구 역삼동 테헤란로 212 (06221) / "
        "이메일: dx_jh@naver.com / 카드: 9992-1221-3001-2004 / "
        "AWS 키: AKIAABCD1234EFGH5678 / JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb"
    )
    print("ORIGIN :", sample)
    print("MASKING :", p.anonymize(sample))
