# judge_llm/api/app/masking/high_entropy_recognizer.py
"""
HighEntropyTokenRecognizer
- 길고 엔트로피가 높은 토큰/시크릿(베어 값) 탐지
- Presidio PatternRecognizer 기반
"""
from __future__ import annotations
import re
from typing import List
from presidio_analyzer import Pattern, PatternRecognizer, RecognizerResult

# 길이 50+의 base64-ish/URL-safe 문자들(스페이스/경계 포함)
_HIGH_ENTROPY_RX = r"(?<![A-Za-z0-9/+=._-])[A-Za-z0-9/+=._~-]{50,}(?![A-Za-z0-9/+=._-])"

class HighEntropyTokenRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern("high_entropy_blob", _HIGH_ENTROPY_RX, 0.50),
        ]
        super().__init__(
            supported_entity="HIGH_ENTROPY_TOKEN",
            name="HighEntropyTokenRecognizer",
            patterns=patterns,
            context=["secret","token","key","credential","env","config","header"],
        )

    def analyze(self, text: str, entities: List[str] = None, nlp_artifacts=None) -> List[RecognizerResult]:
        # Presidio v2 호환: supported_entities(list) 우선
        target = None
        if hasattr(self, "supported_entities") and self.supported_entities:
            target = self.supported_entities[0]
        else:
            target = getattr(self, "supported_entity", None)

        if entities and (target not in entities):
            return []

        # 기본 탐지
        results = super().analyze(text, entities, nlp_artifacts)

        # 간단한 후처리(너무 반복적인 문자만 있는 경우 등은 버림)
        filtered = []
        for r in results:
            span = text[r.start:r.end]
            # 예: aaaaa… 같은 저엔트로피 제거(고정 임계: 서로 다른 문자 6종 이상 요구)
            if len(set(span)) >= 6:
                filtered.append(r)
        return filtered
