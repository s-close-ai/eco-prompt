# judge_llm/api/app/masking/kr_bizno_recognizer.py
"""
KRBizNoRecognizer
- 한국 사업자등록번호 인식기 (Presidio PatternRecognizer 기반)
- 3-2-5 포맷/연속 10자리 탐지 + 국세청 체크섬 검증
- 체크섬 불통과라도 '명시 문맥'이 강하면 낮은 점수로 허용
"""
from __future__ import annotations
import re
from presidio_analyzer import Pattern, PatternRecognizer

_BIZNO_RX = r"(?<!\d)(?:\d{3}-\d{2}-\d{5}|\d{10})(?!\d)"
_CTX = ["사업자","사업자번호","사업자등록번호","사업자등록","biz","business","tax","고유번호","사업자 No"]

def _bizno_checksum_ok(d10: str) -> bool:
    if len(d10) != 10 or not d10.isdigit():
        return False
    w = [1,3,7,1,3,7,1,3,5]
    s = sum(int(d)*w[i] for i,d in enumerate(d10[:9]))
    s += (int(d10[8])*5)//10
    check = (10 - (s % 10)) % 10
    return check == int(d10[9])

class KRBizNoRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [Pattern("kr_bizno", _BIZNO_RX, 0.70)]
        super().__init__(
            supported_entity="KR_BIZNO",
            name="KRBizNoRecognizer",
            patterns=patterns,
            context=_CTX,
        )

    def analyze(self, text, entities=None, nlp_artifacts=None):
        # Presidio v2 호환: supported_entities 우선
        target = self.supported_entities[0] if getattr(self, "supported_entities", None) else getattr(self, "supported_entity", None)
        if entities and (target not in entities):
            return []
        results = super().analyze(text, entities, nlp_artifacts)

        out = []
        for r in results:
            span = text[r.start:r.end]
            digits = re.sub(r"\D", "", span)
            if _bizno_checksum_ok(digits):
                r.score = max(r.score, 0.95)
                out.append(r)
                continue
            # 체크섬 실패 → 문맥 강하면 제한적 허용
            ctx = text[max(0, r.start-48): min(len(text), r.end+48)]
            if any(k in ctx for k in _CTX):
                r.score = max(r.score, 0.80)
                out.append(r)
        return out