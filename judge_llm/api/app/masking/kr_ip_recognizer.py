# judge_llm/api/app/masking/kr_ip_recognizer.py
"""
KRIPRecognizer
- IPv4/IPv6 인식
- 사설 IPv4 대역(10/8, 172.16-31/12, 192.168/16, 127/8)은 낮은 score
"""
from __future__ import annotations
from presidio_analyzer import Pattern, PatternRecognizer

# IPv4 (0-255). IPv4 정규식은 가독성/성능 균형형
_IPV4 = (
    r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}"
    r"(?:25[0-5]|2[0-4]\d|1?\d?\d)\b"
)

# IPv6 (축약 포함)
_IPV6 = (
    r"\b(?:[A-Fa-f0-9]{1,4}:){1,7}[A-Fa-f0-9]{1,4}\b"
)

# 사설 IPv4 패턴 (낮은 점수)
_PRIV_V4 = (
    r"\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
    r"|192\.168\.\d{1,3}\.\d{1,3}"
    r"|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
    r"|127\.\d{1,3}\.\d{1,3}\.\d{1,3})\b"
)

class KRIPRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [
            Pattern("ipv4_public", _IPV4, 0.80),
            Pattern("ipv6", _IPV6, 0.75),
            Pattern("ipv4_private", _PRIV_V4, 0.40),
        ]
        context = ["ip", "아이피", "server", "서버", "endpoint", "host", "url"]
        super().__init__(
            supported_entity="IP_ADDRESS",
            name="KRIPRecognizer",
            patterns=patterns,
            context=context,
        )
