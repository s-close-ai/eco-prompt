# tests/test_regex_rules.py
# 목적: 규칙 샘플이 정상적으로 매칭/비매칭 되는지 스모크 테스트
import re
from api.app.masking.regex_rules import RULES

def _hits(rx, s):
    return bool(re.search(rx.pattern, s))

def test_phone_mobile_ok():
    r = RULES["PHONE_MOBILE_KR"]
    oks = ["010-1234-5678", "01012345678", "010 9876 5432", "010.345.6789"]
    for s in oks:
        assert _hits(r, s), f"should match: {s}"

def test_phone_mobile_ng():
    r = RULES["PHONE_MOBILE_KR"]
    ngs = ["1010-1234-5678", "010-123-5678"]
    for s in ngs:
        assert not _hits(r, s), f"should NOT match: {s}"

def test_email_ok():
    r = RULES["EMAIL"]
    oks = ["a.b@example.com", "x+z@sub.domain.co.kr", "foo(at)bar(dot)com", "z[at]y[dot]kr"]
    for s in oks:
        assert _hits(r, s)

def test_email_ng():
    r = RULES["EMAIL"]
    ngs = ["abc@@example.com", "abc@localhost", "no at sign"]
    for s in ngs:
        assert not _hits(r, s)

def test_rrn_simple():
    r = RULES["RRN_KR_SIMPLE"]
    assert _hits(r, "900101-1234567")
    assert not _hits(r, "9001011234567")

def test_card_len():
    r = RULES["CARD_NUMBER"]
    assert _hits(r, "4111-1111-1111-1111")
    assert _hits(r, "5520 1234 5678 9012")
    assert not _hits(r, "411111111111")            # 12자리 → NG
    assert not _hits(r, "1234-5678-9012-34567-8")  # 너무 김 → NG

def test_address_loose():
    r = RULES["ADDRESS_KR_LOOSE"]
    assert _hits(r, "서울특별시 강남구 역삼동 테헤란로 212 (06221)")
    assert not _hits(r, "서울특별시 경제 동향")

def test_employee_id():
    r = RULES["EMPLOYEE_ID"]
    assert _hits(r, "EMP-001234")
    assert _hits(r, "SS123456")
    assert not _hits(r, "EMP-12")
