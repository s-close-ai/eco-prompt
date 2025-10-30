# judge_llm/api/app/masking/kr_bank_recognizer.py
"""
KRBankRecognizer
- 한국 은행 계좌번호 탐지기 (Presidio PatternRecognizer 기반)
- 은행명 및 계좌 관련 문맥과 함께 등장하는 숫자열(10~16자리)을 탐지
- 주요 탐지 대상:
    1. 은행명 + 계좌번호 조합 (예: 국민은행 110-234-567890)
    2. 일반 계좌번호 표기 (예: 계좌번호 3333 12 345678)
- 컨텍스트 기반: "은행", "계좌번호", "통장", "account" 등
"""

from __future__ import annotations
import re
from presidio_analyzer import Pattern, PatternRecognizer

# 한국 주요 은행명 목록 (컨텍스트 점수 보강용)
_BANKS = [
    "국민","신한","우리","하나","농협","기업","대구","부산","광주","전북","제주",
    "SC제일","카카오","케이뱅크","토스","수협","산업","씨티","우체국"
]

# 계좌 관련 컨텍스트 단어
BANK_WORDS = ["은행","계좌","계좌번호","통장","account","acct","account_no","입금"]

# 계좌번호 기본 포맷 (2~4)-(1~6)-(2~6) / 공백, 하이픈 허용 / 총 10~16자리
_RX = r"(?<!\d)(?:\d{2,4}[\-\s]?\d{1,6}[\-\s]?\d{2,6})(?!\d)"


class KRBankRecognizer(PatternRecognizer):
    """
    계좌번호 검출기:
    - 하이픈/공백 포함된 숫자열을 탐지하고
    - 은행명 또는 '계좌번호' 등의 문맥에서 탐지될 때 신뢰도 상승
    """

    def __init__(self):
        patterns = [
            Pattern(
                name="kr_bank_acct_loose",
                regex=_RX,
                score=0.40,  # 컨텍스트 있을 때만 가중치 상승
            ),
        ]
        context = BANK_WORDS + _BANKS

        super().__init__(
            supported_entity="KR_BANK_ACCOUNT",
            name="KRBankRecognizer",
            patterns=patterns,
            context=context,
        )

    def validate_result(self, pattern_text: str) -> bool:
        """
        탐지된 텍스트가 계좌번호로서 현실적인지 2차 검증
        (숫자 길이 10~16 사이만 유효)
        """
        digits = re.sub(r"\D", "", pattern_text)
        return 10 <= len(digits) <= 16
