# judge_llm/api/app/masking/high_entropy_recognizer.py
"""
HighEntropyTokenRecognizer
- Base64/URL-safe 계열의 긴 토큰 + 엔트로피 기반 필터
- JWT 등과 중복될 수 있으므로 entity 분류: HIGH_ENTROPY_TOKEN
"""
from __future__ import annotations
import math
import re
from typing import List
from presidio_analyzer import Pattern, PatternRecognizer, RecognizerResult

# 길이 24+ 의 Base64/URL-safe 알파벳 시퀀스
_BASE64_URLISH = r"(?<![A-Za-z0-9_\-\/\+=])[A-Za-z0-9_\-\/\+=]{24,}(?![A-Za-z0-9_\-\/\+=])"

def shannon_entropy(s: str) -> float:
    if not s:
        return 0.0
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    n = len(s)
    return -sum((c/n) * math.log2(c/n) for c in freq.values())

class HighEntropyTokenRecognizer(PatternRecognizer):
    def __init__(self, entropy_threshold: float = 3.5):
        super().__init__(
            supported_entity="HIGH_ENTROPY_TOKEN",
            name="HighEntropyTokenRecognizer",
            patterns=[Pattern("base64ish_long", _BASE64_URLISH, 0.40)],
            context=["token", "secret", "apikey", "key", "bearer", "auth", "credential"],
        )
        self.entropy_threshold = entropy_threshold

    def validate_result(self, pattern_text: str) -> bool:
        # 너무 긴 base64 blob은 이미 다른 recognizer(SECRET_KEY 등)와 중복될 수 있으니
        # 엔트로피로 보수적 필터링
        return shannon_entropy(pattern_text) >= self.entropy_threshold

    def analyze(self, text: str, entities: List[str] = None, nlp_artifacts=None) -> List[RecognizerResult]:
        if entities and self.supported_entity not in entities:
            return []
        results = super().analyze(text, entities, nlp_artifacts)
        filtered: List[RecognizerResult] = []
        for r in results:
            if self.validate_result(text[r.start:r.end]):
                # 엔트로피 요건 충족 시 점수 상향
                r.score = max(r.score, 0.80)
                filtered.append(r)
        return filtered
