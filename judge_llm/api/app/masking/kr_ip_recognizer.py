# judge_llm/api/app/masking/kr_ip_recognizer.py
"""
KRIPRecognizer
- IPv4/IPv6 인식기 (Presidio PatternRecognizer 기반)
- 사설 IPv4(10/8, 172.16~31/12, 192.168/16, 127/8)는 낮은 score
- IPv6 짧은 콜론열/저길이 오탐을 validator로 억제
- 컨텍스트(‘ip’, ‘server’, ‘host’, ‘url’ 등) 근처에서만 유효성 강화
"""

from __future__ import annotations
import re
from presidio_analyzer import Pattern, PatternRecognizer, RecognizerResult

# IPv4 (0–255 범위)
_IPV4 = (
    r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}"
    r"(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"
)

# IPv6 (축약 포함 단순형 — validator에서 필터링)
_IPV6 = r"\b(?:[A-Fa-f0-9]{1,4}:){1,7}[A-Fa-f0-9]{1,4}\b"

# 사설 IPv4 — 낮은 점수 부여
_PRIV_V4 = (
    r"\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r"|192\.168\.\d{1,3}\.\d{1,3}"
    r"|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
    r"|127\.\d{1,3}\.\d{1,3}\.\d{1,3})\b"
)

# 컨텍스트 단어 집합
_CTX = {"ip", "아이피", "server", "서버", "endpoint", "host", "url", "addr", "address"}


class KRIPRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern("ipv4_public",  _IPV4,    0.80),
            Pattern("ipv6",         _IPV6,    0.75),
            Pattern("ipv4_private", _PRIV_V4, 0.40),
        ]
        super().__init__(
            supported_entity="IP_ADDRESS",
            name="KRIPRecognizer",
            patterns=patterns,
            context=list(_CTX),
        )

    def validate_result(self, pattern_text: str) -> bool:
        """
        IPv6 오탐 방지:
        - 콜론 4개 미만이거나 길이 < 15인 짧은 IPv6 토큰은 배제
        (코드, 시간, 포트 구분 문자열 오탐 억제)
        """
        s = pattern_text.strip()
        if ":" in s:
            if s.count(":") < 4 or len(s) < 15:
                return False
        return True

    def analyze(self, text: str, entities=None, nlp_artifacts=None):
        """
        기본 탐지 결과 중 컨텍스트 윈도우(±32자) 내에
        ‘ip’, ‘server’, ‘host’, ‘url’ 등의 키워드가 없는 항목은 배제.
        """
        target = (
            self.supported_entities[0]
            if getattr(self, "supported_entities", None)
            else getattr(self, "supported_entity", None)
        )
        if entities and (target not in entities):
            return []

        results = super().analyze(text, entities, nlp_artifacts)
        if not results:
            return results

        filtered: list[RecognizerResult] = []
        for r in results:
            s = max(0, r.start - 32)
            e = min(len(text), r.end + 32)
            window = text[s:e].lower()

            # 컨텍스트 단어 존재 시 통과
            if any(tok in window for tok in _CTX):
                filtered.append(r)
                continue

            # 명시적 접두어(IP:, ip= 등) 허용
            left = text[max(0, r.start - 4):r.start]
            if re.search(r"(?:\bIP\b\s*[:=]|ip\s*[:=])", left, flags=re.I):
                filtered.append(r)

        return filtered
