# judge_llm/api/app/masking/kr_email_recognizer.py
"""
KREmailRecognizer
- (at)/(dot) 난독화까지 잡는 한글 친화 이메일 인식기
- Presidio PatternRecognizer 기반
"""
from __future__ import annotations
from typing import List
from presidio_analyzer import Pattern, PatternRecognizer

# (at)/(dot) 난독화까지 커버하는 패턴
# local@domain.tld  | local(at)domain(dot)tld  | local[at]domain[dot]tld
# 도메인 TLD 길이: 2~24
_EMAIL_OBF_RX = (
    r"(?<![\w\.\-])"                       # left boundary
    r"[\w.\-+%]+"                          # local
    r"(?:@|\(at\)|\[at\])"                 # at
    r"[A-Za-z0-9.\-]+"                     # domain
    r"(?:\.|\(dot\)|\[dot\])"              # dot
    r"[A-Za-z]{2,24}"                      # tld
    r"(?![\w.\-])"                         # right boundary
)

class KREmailRecognizer(PatternRecognizer):
    def __init__(self):
        patterns: List[Pattern] = [
            Pattern("kr_email_obf", _EMAIL_OBF_RX, 0.90),
        ]
        context = ["이메일", "메일", "email", "e-mail", "contact", "연락"]
        super().__init__(
            supported_entity="EMAIL_ADDRESS",
            name="KREmailRecognizer",
            patterns=patterns,
            context=context,
        )
