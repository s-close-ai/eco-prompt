# judge_llm/api/app/masking/regex_rules.py
"""
Presidio 통합 베이스 레지스트리
- 한국어 PII + 글로벌 시크릿/토큰 패턴 탐지용 공통 리소스
- 컨텍스트(POS/NEG), 한국 성씨 Top100, 정규식 패턴, Recognizer 헬퍼 포함
- Presidio PatternRecognizer 기반
"""

from __future__ import annotations
from typing import List
from presidio_analyzer import Pattern, PatternRecognizer

# 보강형 커스텀 Recognizer들
from .kr_address_recognizer import KRAddressEnhancedRecognizer
from .kr_email_recognizer import KREmailRecognizer
from .kr_ip_recognizer import KRIPRecognizer
from .high_entropy_recognizer import HighEntropyTokenRecognizer as HighEntropyRecognizer
from .kr_bank_recognizer import KRBankRecognizer
from .kr_bizno_recognizer import KRBizNoRecognizer
from .kr_secret_ext_recognizer import KRSecretExtRecognizer


# 한국어 컨텍스트 토큰 세트
POS_CONTEXT_KR: set[str] = {
    # 호칭/직함
    "님","씨","선생","선생님","교수","박사","원장","부장","차장","과장","대리","사원",
    "실장","팀장","대표","상무","전무","사장","회장","연구원","주임","책임","전임","전문",
    # 관계/대인
    "아버지","어머니","부모","형","누나","오빠","언니","동생","남편","아내","배우자",
    "친구","지인","고객","환자","보호자","학생","의뢰인","지원자","수험생",
    # 연락/식별
    "전화","연락","연락처","휴대폰","핸드폰","모바일","tel","phone","fax","이메일","메일",
    "주소","집주소","직장","회사주소","우편","zipcode",
    # 계정/보안
    "계좌","계좌번호","통장","카드","신용카드","보안카드","비밀번호","비번","password",
    "아이디","id","계정","login","로그인","토큰","token","apikey","api key","secret","jwt",
    # 문서/신분
    "면허","운전면허","여권","주민등록","주민번호","사업자번호","고유번호","등록번호","고객번호",
    # 인증/신청
    "인증","본인인증","본인확인","제출","신청","양식","접수","등록","가입",
    # 일반 혼용
    "contact","mobile","address","resident","passport","account","account_no","dob",
}

NEG_CONTEXT_KR: set[str] = {
    # 기관/조직/브랜드
    "주식회사","㈜","회사","법인","기관","정부","공사","공단","대학","대학교","고등학교","병원",
    "센터","연구소","재단","본부","사업부","팀","조직","학과","학회","협회",
    "네이버","카카오","삼성","LG","현대","기아","구글","애플","엔비디아","마이크로소프트",
    "라인","쿠팡","토스","당근","요기요","배민","NHN","KT","SKT","SK하이닉스",
    # 지명/행정
    "대한민국","서울특별시","부산광역시","대구광역시","인천광역시","광주광역시",
    "대전광역시","울산광역시","세종특별자치시","경기도","충청북도","전라북도","경상남도","제주도",
    "강남구","서초구","송파구","마포구","용산구","종로구","해운대구",
    # 일반 명사/업무
    "데이터","분석","시스템","서버","모델","프로젝트","회의","문서","계약","납품","품질",
    "마케팅","물류","생산","제조","공정","설비","유지보수","서비스","제품","영업",
    # 시설/건물(주소 과탐지 힌트)
    "도로","교차로","지하철","역","터미널","공원","빌딩","타워","로","번지",
}

# 한국 성씨 Top100 (2020 행안부 요약)
SURNAMES_KR_TOP100: set[str] = {
    "김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","류","유",
    "전","홍","고","문","손","배","백","허","남","심","노","양","주","우","민","진","채","천","공","현",
    "방","변","염","여","추","도","소","석","곽","나","마","함","구","하","표","탁","라","설","명",
    "제","모","길","위","반","호","맹","국","남궁","선우","사공","제갈","황보","독고","서문","동방",
    "빈","피","목","금","두","엄","우","차","채","심",
}

# 한국형 PII 정규식 패턴
PATTERN_PHONE_KR = [
    Pattern("kr_mobile_phone", r"(?<!\d)(?:0?10(?:[\s\-\.]?\d{4}){2}|0?10\d{8})(?!\d)", 0.90),
    Pattern("kr_area_phone",  r"(?<!\d)(?:0[2-6]\d?)[\s\-\.]?\d{3,4}[\s\-\.]?\d{4}(?!\d)", 0.85),
]

PATTERN_RRN_KR = [
    Pattern("kr_rrn",          r"(?<!\d)\d{6}\-\d{7}(?!\d)", 0.95),
    Pattern("kr_rrn_compact",  r"(?<!\d)\d{13}(?!\d)",       0.85),
]

PATTERN_CARD_GENERIC = [
    Pattern("card_block_4x",    r"(?<!\d)\d{4}(?:[\s\-]?\d{4}){2,4}(?!\d)", 0.65),
    Pattern("card_contiguous",  r"(?<!\d)\d{13,19}(?!\d)",                 0.35),
]

PATTERN_ADDRESS_LOOSE_KR = [
    Pattern(
        "kr_addr_loose",
        r"(?:[가-힣A-Za-z]{2,}(?:시|도))\s+(?:[가-힣A-Za-z]{1,}(?:구|군)|[가-힣A-Za-z0-9]{1,}(?:동|읍|면)|[가-힣A-Za-z0-9]{1,}(?:로|길)\s*\d{1,4}|\d{1,4}(?:-\d{1,4})?번?지?)(?:\s*\(\d{5}\))?",
        0.40,
    ),
]

# 글로벌 시크릿/토큰/자격증명 패턴
PATTERN_SECRETS_GLOBAL = [
    # AWS
    Pattern("aws_access_key", r"AKIA[0-9A-Z]{16}", 0.95),
    Pattern("aws_secret_key", r"(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])", 0.90),

    # Google API Key
    Pattern("gcp_api_key", r"AIza[0-9A-Za-z\-_]{35}", 0.95),

    # Azure Connection strings(대표 키워드 기반)
    Pattern("azure_conn_str", r"(AccountKey|SharedAccessKey|PrimaryKey|ClientSecret)\s*=\s*[A-Za-z0-9/\+=]{20,}", 0.90),

    # JWT(헤더.페이로드.서명)
    Pattern("jwt_token", r"eyJ[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+", 0.95),

    # Git SHA(7~40) — 숫자-only 오탐 방지
    Pattern("git_sha", r"\b(?=[a-f0-9]{7,40}\b)(?=.*[a-f])[a-f0-9]{7,40}\b", 0.60),

    # SSH / PEM Private Key
    Pattern("pem_private_key", r"-----BEGIN (?:RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----", 1.00),

    # UUID (8-4-4-4-12)
    Pattern("uuid_generic", r"\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b", 0.70),

    # Generic API tokens (20+)  ※ 고엔트로피 인식기와 보완 관계
    Pattern("api_token_generic", r"(?<![A-Za-z0-9/\-_])[A-Za-z0-9/\-_]{20,}(?![A-Za-z0-9/\-_])", 0.60),
    # (중복 방지) high_entropy_blob 패턴은 HighEntropyTokenRecognizer로 이동
]

# Recognizer 헬퍼
def make_phone_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="KR_PHONE_NUMBER",
        name="KRPhoneRecognizer",
        patterns=PATTERN_PHONE_KR,
        context=list(POS_CONTEXT_KR | {"mobile", "tel", "phone"}),
    )

def make_rrn_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="KR_RRN",
        name="KRRRNRecognizer",
        patterns=PATTERN_RRN_KR,
        context=list(POS_CONTEXT_KR | {"resident", "rrn", "id"}),
    )

def make_card_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="CREDIT_CARD",
        name="KRCardRecognizer",
        patterns=PATTERN_CARD_GENERIC,
        context=list(POS_CONTEXT_KR | {"카드", "결제", "payment", "card"}),
    )

def make_addr_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="KR_ADDRESS",
        name="KRAddressLooseRecognizer",
        patterns=PATTERN_ADDRESS_LOOSE_KR,
        context=list(POS_CONTEXT_KR | {"주소", "address"}),
    )

def make_secret_recognizer() -> PatternRecognizer:
    return PatternRecognizer(
        supported_entity="SECRET_KEY",
        name="GlobalSecretRecognizer",
        patterns=PATTERN_SECRETS_GLOBAL,
        context=["aws","gcp","google","azure","key","secret","token","credential","jwt","pem","env","config","git","uuid"],
    )

def make_all_default() -> List[PatternRecognizer]:
    """PII + Secrets 통합 기본 세트 (중복 제거/보강 버전)"""
    return [
        # 기본 PII
        make_phone_recognizer(),
        make_rrn_recognizer(),
        make_card_recognizer(),
        make_addr_recognizer(),
        make_secret_recognizer(),
        KRAddressEnhancedRecognizer(),
        KREmailRecognizer(),            
        KRIPRecognizer(),
        HighEntropyRecognizer(),
        KRBizNoRecognizer(),
        KRBankRecognizer(),                                                                                      
        KRSecretExtRecognizer(),
    ]
