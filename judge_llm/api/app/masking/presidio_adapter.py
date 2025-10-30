# judge_llm/api/app/masking/presidio_adapter.py
from __future__ import annotations
from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.recognizer_registry import RecognizerRegistry
from presidio_analyzer.nlp_engine import SpacyNlpEngine
from presidio_anonymizer import AnonymizerEngine, OperatorConfig
from .regex_rules import make_all_default

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
            "KR_PHONE_NUMBER": OperatorConfig("replace", {"new_value": "<PHONE>"}),
            "KR_RRN":          OperatorConfig("replace", {"new_value": "<RRN>"}),
            "KR_ADDRESS":      OperatorConfig("replace", {"new_value": "<ADDRESS>"}),
            "EMAIL_ADDRESS":   OperatorConfig("replace", {"new_value": "<EMAIL>"}),
            "CREDIT_CARD":     OperatorConfig("replace", {"new_value": "<CARD>"}),
            "SECRET_KEY":      OperatorConfig("replace", {"new_value": "<SECRET>"}),
            # 이름은 FP 위험으로 초기 비활성. 필요 시 추가:
            # "KR_PERSON_NAME":   OperatorConfig("replace", {"new_value": "<NAME>"}),
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
        results = self.analyze(text, lang=lang)
        return self.anonymizer.anonymize(
            text=text, analyzer_results=results, operators=self.operators
        ).text


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
