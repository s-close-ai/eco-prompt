# judge_llm/api/app/masking/kr_secret_ext_recognizer.py
"""
KRSecretExtRecognizer
- 설정파일/로그 내 비밀번호·토큰·API 키 등 시크릿 문자열 탐지기
- Presidio PatternRecognizer 기반
- 주요 탐지 대상:
    1. password=abc123!, passwd: qwerty, pwd = mySecret
    2. token=XYZ..., api_key: abcdef123, x-api-key=...
    3. Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
- 컨텍스트 기반: "password", "token", "auth", "config", "로그", "환경변수" 등
"""

from __future__ import annotations
from presidio_analyzer import Pattern, PatternRecognizer

# 주요 시크릿/설정 패턴
_PATTERNS = [
    # 일반 비밀번호 설정 키워드
    Pattern("cfg_password_kv",
            r"(?:password|passwd|pwd)\s*[:=]\s*[^,\s\"']{4,}", 0.85),

    # API Key / 토큰 / X-API-KEY 형태
    Pattern("cfg_token_kv",
            r"(?:token|api[_-]?key|x-api-key)\s*[:=]\s*[A-Za-z0-9_\-\/\+=]{16,}", 0.85),

    # Authorization 헤더 내 Bearer 토큰
    Pattern("auth_bearer",
            r"Authorization\s*:\s*Bearer\s+[A-Za-z0-9_\-\.~+/=]{20,}", 0.90),
]

# 탐지 강화용 문맥 단어
_CONTEXT = [
    "password","passwd","pwd","토큰","token","apikey","api key","auth","authorization",
    "secret","credential","header","bearer","config","env","환경변수","설정","로그"
]


class KRSecretExtRecognizer(PatternRecognizer):
    """
    Presidio 기반 로그/환경변수 시크릿 검출기
    - 설정 키 형태(K=V) 및 Authorization 헤더까지 포괄
    - HighEntropyRecognizer와 병행 시 시크릿 탐지 커버리지 완성
    """

    def __init__(self):
        super().__init__(
            supported_entity="SENSITIVE_CONFIG",
            name="KRSecretExtRecognizer",
            patterns=_PATTERNS,
            context=_CONTEXT,
        )
