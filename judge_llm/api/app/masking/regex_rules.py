# judge_llm/api/app/masking/regex_rules.py
# 목적: PII(민감정보) 정규식 규칙 정의 및 유틸 (카테고리, 패턴, 옵션, 샘플)
# 사용처: RegexMasker에서 import하여 탐지/마스킹에 사용

from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Dict, List, Pattern, Optional

@dataclass(frozen=True)
class Rule:
    key: str                 # 고유키 (예: PHONE_MOBILE_KR)
    category: str            # 카테고리 (예: phone, email, id, address, name, card)
    desc: str                # 설명
    pattern: Pattern[str]    # 컴파일된 정규식
    flags: int = 0           # re 플래그(디폴트 0)
    example_ok: List[str] = None  # 탐지되어야 할 예시
    example_ng: List[str] = None  # 탐지되면 안 되는 예시

# 유틸: 간단한 helper (가독성)
def _compile(rx: str, flags: int = 0) -> Pattern[str]:
    return re.compile(rx, flags)

# ===== 규칙 정의 =====
# 한국 전화번호 분리 표기일 때는 3-4-4 고정(가운데 4자리) / 붙여쓴 경우는 010 + 8자리(총 11자리) 허용
PHONE_MOBILE_KR = Rule(
    key="PHONE_MOBILE_KR",
    category="phone",
    desc="KR mobile numbers: 010-1234-5678 / 01012345678 (3-4-4 or 11 digits)",
    pattern=_compile(
        r"""
        (?<!\d)
        (?:
          0?10(?:[\s\-\.]?\d{4}){2}   # 010-1234-5678 / 010 1234 5678 / 010.1234.5678
          |
          0?10\d{8}                   # 01012345678
        )
        (?!\d)
        """,
        re.VERBOSE,
    ),
    example_ok=["010-1234-5678", "01012345678", "010 1234 5678", "010.2345.6789"],
    example_ng=["010-123-5678", "1010-1234-5678"]
)


# 한국 일반/지역번호(02, 031 등) 포함 가능
PHONE_KR_GENERAL = Rule(
    key="PHONE_KR_GENERAL",
    category="phone",
    desc="KR phones with area code like 02-123-4567, 031-123-4567",
    pattern=_compile(
        r"""
        (?<!\d)
        (?:0[2-6]\d?)           # 02, 031, 032, ... (간략형)
        [\s\-\.]?
        \d{3,4}
        [\s\-\.]?
        \d{4}
        (?!\d)
        """,
        re.VERBOSE,
    ),
    example_ok=["02-345-6789", "031 234 5678", "051.999.1234"],
    example_ng=["002-345-6789"]
)

# 이메일 (일반형 + (at)/(dot) 변형 일부 허용)
EMAIL = Rule(
    key="EMAIL",
    category="email",
    desc="Emails including obfuscations like (at), [at], (dot)",
    pattern=_compile(
        r"""
        (?<![\w\.\-])
        [\w.\-+%]+
        (?:@|\(at\)|\[at\])     # @ 또는 (at)/[at]
        [\w.\-]+
        (?:\.|\(dot\)|\[dot\])  # . 또는 (dot)/[dot]
        [A-Za-z]{2,24}
        (?![\w.\-])
        """,
        re.VERBOSE | re.IGNORECASE,
    ),
    example_ok=[
        "alice.kim@example.com",
        "bob+news@sub.example.co.kr",
        "carol(at)example(dot)com",
        "dave[at]mail[dot]kr"
    ],
    example_ng=["alice.kim@@example.com", "abc@localhost"]
)

# 주민등록번호(단순패턴) — 실제 운영 시 파이프라인에서 별도 검증 가능
RRN_KR_SIMPLE = Rule(
    key="RRN_KR_SIMPLE",
    category="id",
    desc="KR Resident Registration Number simple pattern 6-7 digits",
    pattern=_compile(r"(?<!\d)\d{6}\-\d{7}(?!\d)"),
    example_ok=["900101-1234567", "010203-4567890"],
    example_ng=["9001011234567", "900101-123456", "900101-12345678"]
)

# 신용/체크카드 번호(13~19자리, 구분자 허용) — 루한 검증은 마스커에서 선택 적용
CARD_NUMBER = Rule(
    key="CARD_NUMBER",
    category="card",
    desc="Payment card numbers: 13–19 contiguous digits or 4-digit blocks",
    pattern=_compile(
        r"""
        (?<!\d)
        (?:
          \d{13,19}                        # contiguous
          |
          \d{4}(?:[\s\-]?\d{4}){2,4}       # 4-4-4-(4|4|4) (3~5 blocks)
        )
        (?!\d)
        """,
        re.VERBOSE
    ),
    example_ok=["4111-1111-1111-1111", "5520 1234 5678 9012", "6222021234567890"],
    example_ng=["411111111111", "1234-5678-9012-34567-8"]
)


# 여권/사번/사내ID(단순 알파+숫자 6~12, 접두어 포함) — 프로젝트 상황에 맞춰 조정
EMPLOYEE_ID = Rule(
    key="EMPLOYEE_ID",
    category="id",
    desc="Generic employee IDs like SS123456, EMP-001234",
    pattern=_compile(r"(?<![A-Za-z0-9])(?:EMP|SS|ID|STAFF)[\-\_]?\d{4,8}(?![A-Za-z0-9])", re.IGNORECASE),
    example_ok=["EMP-001234", "SS123456", "id_987654"],
    example_ng=["S5", "EMP-12", "STAFF-1234567890"]
)

# 주소(대략형) — 도/시/구/동/로/길/번지 및 우편번호 5자리, 과탐지 방지 위해 완화
ADDRESS_KR_LOOSE = Rule(
    key="ADDRESS_KR_LOOSE",
    category="address",
    desc="KR address loose: require city/province + (gu/gun or dong/eup/myeon or ro/gil+num or beonji)",
    pattern=_compile(
        r"""
        (?:
          (?:[가-힣A-Za-z]{2,}(?:시|도))\s+
          (?:
              [가-힣A-Za-z]{1,}(?:구|군)
            |
              [가-힣A-Za-z0-9]{1,}(?:동|읍|면)
            |
              [가-힣A-Za-z0-9]{1,}(?:로|길)\s*\d{1,4}
            |
              \d{1,4}(?:-\d{1,4})?번?지?
          )
          (?:\s*\(\d{5}\))?
        )
        """,
        re.VERBOSE,
    ),
    example_ok=["서울특별시 강남구 역삼동 테헤란로 212 (06221)", "경기도 성남시 분당구 정자동 1-2번지"],
    example_ng=["서울특별시 경제 동향", "강남 맛집 로드맵"]
)


# 한국인명(매우 보수적, 2~4 글자, 사이 공백 허용) — 과탐지 위험: 기본 OFF 권장
PERSON_NAME_KR_CONSERVATIVE = Rule(
    key="PERSON_NAME_KR_CONSERVATIVE",
    category="name",
    desc="KR person name (2–4 Hangul, optional space). HIGH FP risk → default off",
    pattern=_compile(r"(?<![가-힣])[가-힣]{2,4}(?:\s[가-힣]{2,4})?(?![가-힣])"),
    example_ok=["김재희", "홍 길동"],
    example_ng=["한국타이어", "데이터 분석", "서울 시청"]
)

# 규칙 레지스트리
RULES: Dict[str, Rule] = {
    r.key: r for r in [
        PHONE_MOBILE_KR,
        PHONE_KR_GENERAL,
        EMAIL,
        RRN_KR_SIMPLE,
        CARD_NUMBER,
        EMPLOYEE_ID,
        ADDRESS_KR_LOOSE,
        PERSON_NAME_KR_CONSERVATIVE,
    ]
}

# 카테고리별 조회
def rules_by_category(category: str) -> List[Rule]:
    return [r for r in RULES.values() if r.category == category]

# 기본 활성 규칙 세트 (이름 규칙은 초기 비활성 — 과탐지 방지)
DEFAULT_ACTIVE_KEYS = [
    "PHONE_MOBILE_KR",
    "PHONE_KR_GENERAL",
    "EMAIL",
    "RRN_KR_SIMPLE",
    "CARD_NUMBER",
    "EMPLOYEE_ID",
    "ADDRESS_KR_LOOSE",
    # "PERSON_NAME_KR_CONSERVATIVE",  # 필요 시 활성화
]

def get_active_rules(extra_active: Optional[List[str]] = None,
                     exclude: Optional[List[str]] = None) -> List[Rule]:
    active = set(DEFAULT_ACTIVE_KEYS)
    if extra_active:
        active.update(extra_active)
    if exclude:
        active.difference_update(exclude)
    return [RULES[k] for k in active if k in RULES]
