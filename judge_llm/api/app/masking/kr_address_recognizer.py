# judge_llm/api/app/masking/kr_address_recognizer.py
"""
KRAddressEnhancedRecognizer
- 한국 주소 패턴을 세분화하여 탐지 정확도 향상
- Presidio PatternRecognizer 기반
"""

from __future__ import annotations
from presidio_analyzer import Pattern, PatternRecognizer


class KRAddressEnhancedRecognizer(PatternRecognizer):
    """
    서울특별시 강남구 테헤란로 212 (06221)
    경기도 수원시 영통구 영통로 112
    부산광역시 해운대구 센텀동로 45, 센텀IS타워 7층
    등과 같은 다양한 형태를 포괄.
    """

    def __init__(self):
        # 시/도 → 구/군 → 로/길 → 번지 → 우편번호
        patterns = [
            # 예: 서울특별시 강남구 역삼동 테헤란로 212 (06221)
            Pattern(
                "kr_address_full",
                r"(?:서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|"
                r"경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)"
                r"(?:\s*[가-힣A-Za-z0-9]{1,10}(?:구|군|시))?"
                r"(?:\s*[가-힣A-Za-z0-9]{1,10}(?:동|읍|면))?"
                r"(?:\s*[가-힣A-Za-z0-9]{1,20}(?:로|길))?"
                r"(?:\s*\d{1,4}(?:-\d{1,4})?)?"
                r"(?:\s*\(\d{5}\))?",
                0.95,
            ),
            # 예: 경기도 수원시 영통구 123-45
            Pattern(
                "kr_address_simple",
                r"(?:[가-힣A-Za-z]{2,}(?:시|도))\s+[가-힣A-Za-z]{1,}(?:구|군)\s+\d{1,4}(?:-\d{1,4})?",
                0.70,
            ),
        ]

        context = [
            "주소", "address", "위치", "도로명", "도로명주소",
            "건물", "빌딩", "아파트", "호", "층", "우편번호",
        ]

        super().__init__(
            supported_entity="KR_ADDRESS",
            name="KRAddressEnhancedRecognizer",
            patterns=patterns,
            context=context,
        )
