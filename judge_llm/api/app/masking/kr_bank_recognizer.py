# judge_llm/api/app/masking/kr_bank_recognizer.py
"""
KRBankRecognizer
- 한국 은행 계좌번호 탐지기 (Presidio PatternRecognizer 기반)
- 은행명/계좌 관련 문맥과 함께 등장하는 숫자열(10~16자리)을 탐지
- 전화번호(010-xxxx-xxxx 등) 및 '사업자등록번호(3-2-5)' 오탐 방지 강화
"""
from __future__ import annotations
import re
from presidio_analyzer import Pattern, PatternRecognizer

# 한국 주요 은행명(컨텍스트 보강)
_BANKS = [
    "국민","신한","우리","하나","농협","기업","대구","부산","광주","전북","제주",
    "SC제일","카카오","케이뱅크","토스","수협","산업","씨티","우체국"
]
# 컨텍스트 단어(확장)
BANK_WORDS = [
    "은행","계좌","계좌번호","통장","입금","송금","이체",
    "account","acct","account_no","accountNo","accountId","acctId"
]

# 기본 포맷(2~4)-(1~6)-(2~6) / 공백·하이픈 허용 / 총 10~16자리
# 시작 위치에서 '3-2-5(사업자)'가 바로 이어지는 경우 제외(음수 전방 탐색)
_RX = r"(?<!\d)(?!\d{3}-\d{2}-\d{5}\b)\d{2,4}[\-\s]?\d{1,6}[\-\s]?\d{2,6}(?!\d)"

# 전화번호 패턴(오탐 차단용)
_RX_PHONE = re.compile(
    r"^(?:0?10(?:[-.\s]?\d{4}){2}|0[2-6]\d?[-.\s]?\d{3,4}[-.\s]?\d{4})$"
)

# 사업자번호 3-2-5 포맷(오탐 차단용)
_RX_BIZ_FMT = re.compile(r"^\d{3}-\d{2}-\d{5}$")


class KRBankRecognizer(PatternRecognizer):
    def __init__(self):
        patterns = [Pattern("kr_bank_acct_loose", _RX, 0.35)]  # 살짝 상향(컨텍스트로 최종 보강)
        context = BANK_WORDS + _BANKS
        super().__init__(
            supported_entity="KR_BANK_ACCOUNT",
            name="KRBankRecognizer",
            patterns=patterns,
            context=context,
        )

    def validate_result(self, pattern_text: str) -> bool:
        """
        2차 검증:
        - 숫자 길이 10~16
        - 전화번호/사업자 포맷과 유사하면 배제
        """
        text = pattern_text.strip()
        if _RX_PHONE.match(text) or _RX_BIZ_FMT.match(text):
            return False
        digits = re.sub(r"\D", "", text)
        return 10 <= len(digits) <= 16
