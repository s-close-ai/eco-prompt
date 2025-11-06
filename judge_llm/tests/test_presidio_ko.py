# Presidio-KO 확장 테스트
import json, pathlib, os, re
from collections import defaultdict
from api.app.masking.presidio_adapter import PresidioAdapter

SAMPLES = pathlib.Path("tests/samples.jsonl")

EXPECT_TOKENS = {
    "KR_PHONE_NUMBER": "<PHONE>",
    "KR_RRN": "<RRN>",
    "KR_ADDRESS": "<ADDRESS>",   # 또는 <ADDR_DETAIL> (정책)
    "EMAIL_ADDRESS": "<EMAIL>@",
    "CREDIT_CARD": "<CARD>",
    "SECRET_KEY": "<SECRET>",
    "IP_ADDRESS": "<IP>",
    "KR_BANK_ACCOUNT": "<BANK_ACCT>",
    "KR_BIZNO": "<BIZNO>",
    "SENSITIVE_CONFIG": "<SECRET>",
    "HIGH_ENTROPY_TOKEN": "<SECRET>",
}

# 생성기와 어울리는 "존재 판단"용 정규식들
RX_PHONE = re.compile(r"(0?10(?:[-.\s]?\d{4}){2}|0[2-6]\d?[-.\s]?\d{3,4}[-.\s]?\d{4})")
RX_RRN   = re.compile(r"\d{6}-\d{7}|\b\d{13}\b")
RX_EMAIL = re.compile(r"[\w.\-+%]+@[\w.\-]+\.[A-Za-z]{2,24}|\(at\)|\[at\]")
RX_ADDR  = re.compile(r"(서울특별시|부산광역시|경기도|인천광역시|대전광역시|세종특별자치시|제주특별자치도)")
RX_CARD  = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b|\b\d{13,19}\b")
RX_SECR  = re.compile(r"AKIA[0-9A-Z]{16}|AIza|eyJhbGciOi|-----BEGIN .*PRIVATE KEY-----|[0-9a-f]{7,40}|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b")

# 신규 엔터티 존재 판단
RX_IP    = re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?!$)|$)){4}\b|([0-9a-f]{1,4}:){7}[0-9a-f]{1,4}", re.I)
RX_BANK  = re.compile(r"\b\d{2,4}[-\s]?\d{1,6}[-\s]?\d{2,6}\b")  # 컨텍스트 보강은 엔진이 수행
RX_BIZNO_FMT = re.compile(r"\b(?:\d{3}-\d{2}-\d{5}|\d{10})\b")
RX_CONF  = re.compile(r"(?:password|passwd|pwd)\s*[:=]\s*\S{4,}|(?:token|api[_-]?key|x-api-key)\s*[:=]\s*[\w\-\/\+=]{16,}|Authorization\s*:\s*Bearer\s+[A-Za-z0-9_\-\.~+/=]{20,}")
RX_HET   = re.compile(r"[A-Za-z0-9/+=._~-]{50,}")

# 체크섬 검증(테스트 기대치에서 '유효 사업자'만 긍정으로 센다)
def bizno_checksum_ok(digits10: str) -> bool:
    if len(digits10) != 10 or not digits10.isdigit():
        return False
    w = [1,3,7,1,3,7,1,3,5]
    s = sum(int(d)*w[i] for i,d in enumerate(digits10[:9]))
    s += (int(digits10[8]) * 5) // 10
    check = (10 - (s % 10)) % 10
    return check == int(digits10[9])

def rx_bizno_valid(text: str) -> bool:
    m = RX_BIZNO_FMT.search(text)
    if not m: 
        return False
    digits = re.sub(r"\D","", m.group())
    return bizno_checksum_ok(digits)

def entity_present(orig, rx): 
    return bool(rx.search(orig))

def token_present(masked, token):
    if token == "<ADDRESS>":
        return ("<ADDRESS>" in masked) or ("<ADDR_DETAIL>" in masked)
    return token in masked

def test_presidio_ko_batch():
    os.environ["ADDRESS_POLICY"] = os.getenv("ADDRESS_POLICY", "CITY_GU")
    os.environ["EMAIL_POLICY"]   = os.getenv("EMAIL_POLICY", "KEEP_DOMAIN")

    assert SAMPLES.exists(), "Run: python tests/generate_samples.py 1000"

    adapter = PresidioAdapter()

    stats = defaultdict(lambda: {"TP":0,"FP":0,"FN":0})

    with SAMPLES.open(encoding="utf-8") as f:
        for line in f:
            record = json.loads(line)
            text = record["text"]
            masked = adapter.anonymize(text)

            checks = [
                ("KR_PHONE_NUMBER",    entity_present(text, RX_PHONE), token_present(masked, EXPECT_TOKENS["KR_PHONE_NUMBER"])),
                ("KR_RRN",             entity_present(text, RX_RRN),   token_present(masked, EXPECT_TOKENS["KR_RRN"])),
                ("KR_ADDRESS",         entity_present(text, RX_ADDR),  token_present(masked, EXPECT_TOKENS["KR_ADDRESS"])),
                ("EMAIL_ADDRESS",      entity_present(text, RX_EMAIL), token_present(masked, EXPECT_TOKENS["EMAIL_ADDRESS"])),
                ("CREDIT_CARD",        entity_present(text, RX_CARD),  token_present(masked, EXPECT_TOKENS["CREDIT_CARD"])),
                ("SECRET_KEY",         entity_present(text, RX_SECR),  token_present(masked, EXPECT_TOKENS["SECRET_KEY"])),
                ("IP_ADDRESS",         entity_present(text, RX_IP),    token_present(masked, EXPECT_TOKENS["IP_ADDRESS"])),
                ("KR_BANK_ACCOUNT",    entity_present(text, RX_BANK),  token_present(masked, EXPECT_TOKENS["KR_BANK_ACCOUNT"])),
                ("KR_BIZNO",           rx_bizno_valid(text),           token_present(masked, EXPECT_TOKENS["KR_BIZNO"])),
                ("HIGH_ENTROPY_TOKEN", entity_present(text, RX_HET), token_present(masked, EXPECT_TOKENS["HIGH_ENTROPY_TOKEN"])),
                ("SENSITIVE_CONFIG",   entity_present(text, RX_CONF),  token_present(masked, EXPECT_TOKENS["SENSITIVE_CONFIG"])),
            ]

            for ent, expected, got in checks:
                if expected and got: stats[ent]["TP"] += 1
                elif expected and not got: stats[ent]["FN"] += 1
                elif not expected and got: stats[ent]["FP"] += 1
                # not expected and not got → TN (집계는 F1/정밀도 계산에 필요 없음)

    # 리포트
    print("\n=== Entity-wise Report ===")
    total_tp=total_fp=total_fn=0
    for ent in EXPECT_TOKENS.keys():
        s = stats[ent]
        tp, fp, fn = s["TP"], s["FP"], s["FN"]
        total_tp += tp; total_fp += fp; total_fn += fn
        prec = tp / (tp + fp + 1e-6)
        rec  = tp / (tp + fn + 1e-6)
        f1   = 2*prec*rec/(prec+rec+1e-6)
        print(f"{ent:18s} | P={prec:.3f} R={rec:.3f} F1={f1:.3f} (TP={tp}, FP={fp}, FN={fn})")

    precision = total_tp / (total_tp + total_fp + 1e-6)
    recall    = total_tp / (total_tp + total_fn + 1e-6)
    f1        = 2*precision*recall/(precision+recall+1e-6)
    print(f"\nOverall Precision={precision:.4f} Recall={recall:.4f} F1={f1:.4f}")

    # 전체 목표 가이드
    assert f1 >= 0.90, f"Overall F1 too low: {f1:.3f}"

"""
테스트 시행 방법
1. 샘플 생성
python tests/generate_samples.py
2. 테스트 실행
PYTHONPATH=. pytest -s tests/test_presidio_ko.py

========================= test session starts =========================
platform darwin -- Python 3.12.3, pytest-8.3.5, pluggy-1.6.0
rootdir: /Users/ssafy/S13P31A309/judge_llm
plugins: anyio-4.11.0
collected 1 item                                                      

tests/test_presidio_ko.py 
=== Entity-wise Report ===
KR_PHONE_NUMBER    | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
KR_RRN             | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
KR_ADDRESS         | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
EMAIL_ADDRESS      | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
CREDIT_CARD        | P=1.000 R=0.967 F1=0.983 (TP=967, FP=0, FN=33)
SECRET_KEY         | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
IP_ADDRESS         | P=0.673 R=1.000 F1=0.805 (TP=673, FP=327, FN=0)
KR_BANK_ACCOUNT    | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
KR_BIZNO           | P=0.801 R=0.716 F1=0.757 (TP=561, FP=139, FN=222)
SENSITIVE_CONFIG   | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)
HIGH_ENTROPY_TOKEN | P=1.000 R=1.000 F1=1.000 (TP=1000, FP=0, FN=0)

Overall Precision=0.9563 Recall=0.9756 F1=0.9659

"""
