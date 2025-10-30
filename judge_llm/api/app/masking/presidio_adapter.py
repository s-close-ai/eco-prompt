# judge_llm/api/app/masking/presidio_adapter.py
from __future__ import annotations
import os, re
from typing import List
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.recognizer_registry import RecognizerRegistry
from presidio_analyzer.nlp_engine import SpacyNlpEngine
from presidio_anonymizer import AnonymizerEngine, OperatorConfig
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
    if "@" not in norm:
        return "<EMAIL>"
    try:
        local, domain = norm.split("@", 1)
        domain = domain.strip()
        if not re.match(r"^[A-Za-z0-9\.\-]+\.[A-Za-z]{2,24}$", domain):
            return "<EMAIL>"
        return f"<EMAIL>@{domain}"
    except ValueError:
        return "<EMAIL>"

class PresidioAdapter:
    def __init__(self, mode: str = "conservative"):
        self.mode = mode

        # 1) 빈 레지스트리로 시작(기본 영문 인식기 비활성)
        empty_registry = RecognizerRegistry(recognizers=[])

        # 2) 'ko' → 'en_core_web_lg' 매핑(토크나이징만 활용)
        nlp_engine = SpacyNlpEngine(
            models=[{"lang_code": "ko", "model_name": "en_core_web_lg"}]
        )

        # 3) AnalyzerEngine 구성
        self.analyzer = AnalyzerEngine(registry=empty_registry, nlp_engine=nlp_engine)

        # 4) 커스텀 인식기만 ko 언어로 등록
        for r in make_all_default():
            r.supported_language = "ko"
            self.analyzer.registry.add_recognizer(r)

        # 5) 마스킹 정책
        self.anonymizer = AnonymizerEngine()
        self.operators = {
            "KR_PHONE_NUMBER":    OperatorConfig("replace", {"new_value": "<PHONE>"}),
            "KR_RRN":             OperatorConfig("replace", {"new_value": "<RRN>"}),
            "KR_ADDRESS":         OperatorConfig("replace", {"new_value": "<ADDRESS>"}),
            "EMAIL_ADDRESS":      OperatorConfig("replace", {"new_value": "<EMAIL>"}),
            "CREDIT_CARD":        OperatorConfig("replace", {"new_value": "<CARD>"}),
            "SECRET_KEY":         OperatorConfig("replace", {"new_value": "<SECRET>"}),
            "IP_ADDRESS":         OperatorConfig("replace", {"new_value": "<IP>"}),
            "KR_BANK_ACCOUNT":    OperatorConfig("replace", {"new_value": "<BANK_ACCT>"}),
            "KR_BIZNO":           OperatorConfig("replace", {"new_value": "<BIZNO>"}),
            "SENSITIVE_CONFIG":   OperatorConfig("replace", {"new_value": "<SECRET>"}),
            "HIGH_ENTROPY_TOKEN": OperatorConfig("replace", {"new_value": "<SECRET>"}),
        }

    def analyze(self, text: str, lang: str = "ko"):
        # 화이트리스트: 우리 엔터티만 분석(기본 PERSON/LOCATION 등 차단)
        entities = [
            "KR_PHONE_NUMBER",
            "KR_RRN",
            "KR_ADDRESS",
            "EMAIL_ADDRESS",
            "CREDIT_CARD",
            "SECRET_KEY",
        ]
        return self.analyzer.analyze(text=text, language=lang, entities=entities)

    def anonymize(self, text: str, lang: str = "ko") -> str:
        # 주소/이메일 마스킹
        addr_mail = self.analyzer.analyze(text=text, language=lang, entities=["KR_ADDRESS", "EMAIL_ADDRESS"])
        masked = text
        def _replace_span(s, st, ed, rep): return s[:st] + rep + s[ed:]
        for r in sorted(addr_mail, key=lambda x: x.start, reverse=True):
            span = masked[r.start:r.end]
            repl = _mask_address_with_policy(span) if r.entity_type == "KR_ADDRESS" else _mask_email_with_policy(span)
            masked = _replace_span(masked, r.start, r.end, repl)

        # 나머지 엔터티 자동 탐지
        others = self.analyzer.analyze(
            text=masked, language=lang,
            entities=[
                "KR_PHONE_NUMBER","KR_RRN","CREDIT_CARD","SECRET_KEY",
                "IP_ADDRESS","KR_BANK_ACCOUNT","KR_BIZNO",
                "SENSITIVE_CONFIG","HIGH_ENTROPY_TOKEN",
            ]
        )

        # 엔터티 우선순위 정리(겹침 제거)
        priority = {
            "KR_PHONE_NUMBER": 100, "KR_RRN": 95, "CREDIT_CARD": 85,
            "KR_BANK_ACCOUNT": 80, "KR_BIZNO": 70, "IP_ADDRESS": 60,
            "SENSITIVE_CONFIG": 50, "SECRET_KEY": 45, "HIGH_ENTROPY_TOKEN": 40,
        }
        kept = []
        def overlaps(a,b): return not (a.end <= b.start or b.end <= a.start)
        for r in sorted(others, key=lambda x: (priority.get(x.entity_type,0), -(x.end-x.start)), reverse=True):
            if any(overlaps(r,k) for k in kept): continue
            kept.append(r)

        if kept:
            masked = self.anonymizer.anonymize(text=masked, analyzer_results=kept, operators=self.operators).text
        return masked

if __name__ == "__main__":
    p = PresidioAdapter()
    sample = (
        "이름: 홍길동 / 연락처: 010-1234-5678 / 주민: 900101-1234567 / "
        "주소: 서울특별시 강남구 역삼동 테헤란로 212 (06221) / "
        "이메일: john.doe(at)example(dot)com / 카드: 4111-1111-1111-1111 / "
        "AWS 키: AKIAABCD1234EFGH5678 / JWT: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaa.bbbb "
        "사업자등록번호 123-45-67890 / 기업은행 계좌번호 314-95-379946"
    )
    print("ORIGIN :", sample)
    print("MASKING:", p.anonymize(sample))
