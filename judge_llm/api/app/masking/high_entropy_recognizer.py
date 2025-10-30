# judge_llm/api/app/masking/high_entropy_recognizer.py
"""
HighEntropyTokenRecognizer
- 길고 엔트로피가 높은 토큰/시크릿(베어 값) 탐지
- 가벼운 규칙 기반: (길이 50+) & (문자 다양성 6종 이상)
"""
from __future__ import annotations
from typing import List
from presidio_analyzer import Pattern, PatternRecognizer, RecognizerResult

# 길이 50+ base64/URL-safe 문자 — 경계 인식
_HIGH_ENTROPY_RX = r"(?<![A-Za-z0-9/+=._~-])[A-Za-z0-9/+=._~-]{50,}(?![A-Za-z0-9/+=._-])"

class HighEntropyTokenRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [Pattern("high_entropy_blob", _HIGH_ENTROPY_RX, 0.50)]
        super().__init__(
            supported_entity="HIGH_ENTROPY_TOKEN",
            name="HighEntropyTokenRecognizer",
            patterns=patterns,
            context=["secret","token","key","credential","env","config","header","bearer","auth"],
        )

    def analyze(self, text: str, entities: List[str] = None, nlp_artifacts=None) -> List[RecognizerResult]:
        # Presidio v2 호환
        target = self.supported_entities[0] if getattr(self, "supported_entities", None) else getattr(self, "supported_entity", None)
        if entities and (target not in entities):
            return []
        results = super().analyze(text, entities, nlp_artifacts)

        # 저가변(aaaa…), 지나치게 단조로운 토큰 컷오프
        filtered: List[RecognizerResult] = []
        for r in results:
            span = text[r.start:r.end]
            if len(set(span)) >= 6:
                filtered.append(r)
        return filtered
