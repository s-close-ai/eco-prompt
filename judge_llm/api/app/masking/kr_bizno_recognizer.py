# judge_llm/api/app/masking/kr_bizno_recognizer.py
"""
KRBizNoRecognizer
- 한국 사업자등록번호 인식기 (Presidio PatternRecognizer 기반)
- 3-2-5 포맷 및 연속 10자리 형태를 탐지하고, 국세청 공식 체크섬 검증 로직으로 필터링
- 주요 탐지 대상:
    1. 123-45-67890 (표준 포맷)
    2. 1234567890 (하이픈 없는 연속형)
- 컨텍스트 기반: "사업자", "사업자등록번호", "고유번호", "tax" 등
- 체크섬 검증 통과 시 신뢰도(score) 자동 보강
"""

from __future__ import annotations
import re
from presidio_analyzer import Pattern, PatternRecognizer

# 형식: 3-2-5 (예: 123-45-67890) 또는 10자리 연속형
_BIZNO_RX = r"(?<!\d)(?:\d{3}-\d{2}-\d{5}|\d{10})(?!\d)"

def _bizno_checksum_ok(digits10: str) -> bool:
    """
    국세청 사업자등록번호 검증
    가중치: 1,3,7,1,3,7,1,3,5  (9번째 자릿수는 *5 후 //10 더함)
    check = (10 - ((sum + (d9*5)//10) % 10)) % 10 == d10
    """
    if len(digits10) != 10 or not digits10.isdigit():
        return False
    w = [1, 3, 7, 1, 3, 7, 1, 3, 5]
    s = sum(int(d) * w[i] for i, d in enumerate(digits10[:9]))
    s += (int(digits10[8]) * 5) // 10
    check = (10 - (s % 10)) % 10
    return check == int(digits10[9])

class KRBizNoRecognizer(PatternRecognizer):
    """
    KR_BIZNO 인식기
    - 형식 매칭 후 체크섬으로 FP 제거
    - 체크섬 통과 시 score 상향 (0.95)
    """
    def __init__(self):
        patterns = [Pattern("kr_bizno", _BIZNO_RX, 0.85)]
        context = ["사업자", "사업자번호", "사업자등록번호", "biz", "business", "tax", "고유번호"]
        super().__init__(
            supported_entity="KR_BIZNO",
            name="KRBizNoRecognizer",
            patterns=patterns,
            context=context,
        )

    def analyze(self, text, entities=None, nlp_artifacts=None):
        # Presidio v2 계열: supported_entities(list) 사용
        target = None
        if hasattr(self, "supported_entities"):
            target = self.supported_entities[0] if self.supported_entities else None
        else:
            target = getattr(self, "supported_entity", None)

        if entities and (target not in entities):
            return []

        results = super().analyze(text, entities, nlp_artifacts)
        filtered = []
        for r in results:
            digits = re.sub(r"\D", "", text[r.start:r.end])
            if _bizno_checksum_ok(digits):
                r.score = max(r.score, 0.95)
                filtered.append(r)
        return filtered
