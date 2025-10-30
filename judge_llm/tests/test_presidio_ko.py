# judge_llm/tests/test_presidio_ko.py
# Presidio-KO 확장 테스트
import json, pathlib, os, re
from api.app.masking.presidio_adapter import PresidioAdapter
from collections import defaultdict

SAMPLES = pathlib.Path("tests/samples.jsonl")

# 엔터티별 기대 토큰
EXPECT_TOKENS = {
    "KR_PHONE_NUMBER": "<PHONE>",
    "KR_RRN": "<RRN>",
    "KR_ADDRESS": "<ADDRESS>",
    "EMAIL_ADDRESS": "<EMAIL>@",
    "CREDIT_CARD": "<CARD>",
    "SECRET_KEY": "<SECRET>",
    "IP_ADDRESS": "<IP>",
    "KR_BANK_ACCOUNT": "<BANK_ACCT>",
    "KR_BIZNO": "<BIZNO>",
    "SENSITIVE_CONFIG": "<SECRET>",
}

# 탐지용 정규식
RX_PHONE = re.compile(r"(0?10(?:[-.\s]?\d{4}){2}|0[2-6]\d?[-.\s]?\d{3,4}[-.\s]?\d{4})")
RX_RRN   = re.compile(r"\d{6}-\d{7}|\b\d{13}\b")
RX_EMAIL = re.compile(r"[\w.\-+%]+@[\w.\-]+\.[A-Za-z]{2,24}|\(at\)|\[at\]")
RX_ADDR  = re.compile(r"(서울특별시|부산광역시|경기도|인천광역시|대전광역시|세종특별자치시|제주특별자치도)")
RX_CARD  = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b|\b\d{13,19}\b")
RX_SECR  = re.compile(r"AKIA[0-9A-Z]{16}|AIza|eyJhbGciOi|-----BEGIN .*PRIVATE KEY-----|[0-9a-f]{7,40}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}")
RX_IP    = re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b|[0-9a-fA-F:]{2,}")
RX_BANK  = re.compile(r"\b\d{2,4}[-\s]?\d{1,6}[-\s]?\d{2,6}\b")
RX_BIZNO = re.compile(r"\d{3}-\d{2}-\d{5}|\b\d{10}\b")
RX_CONF  = re.compile(r"(password|passwd|pwd|token|api[_-]?key|Authorization\s*:\s*Bearer)")

def entity_present(orig, rx): return bool(rx.search(orig))
def token_present(masked, token): return token in masked

def test_presidio_ko_batch():
    os.environ["ADDRESS_POLICY"] = os.getenv("ADDRESS_POLICY", "CITY_GU")
    os.environ["EMAIL_POLICY"]   = os.getenv("EMAIL_POLICY", "KEEP_DOMAIN")

    assert SAMPLES.exists(), "Run: python tests/generate_samples.py 1000"

    adapter = PresidioAdapter()
    stats = defaultdict(lambda: {"TP":0,"FP":0,"FN":0})
    total_checks = 0

    with SAMPLES.open(encoding="utf-8") as f:
        for line in f:
            record = json.loads(line)
            text = record["text"]
            masked = adapter.anonymize(text)

            checks = [
                ("KR_PHONE_NUMBER", entity_present(text, RX_PHONE), token_present(masked, EXPECT_TOKENS["KR_PHONE_NUMBER"])),
                ("KR_RRN",          entity_present(text, RX_RRN),   token_present(masked, EXPECT_TOKENS["KR_RRN"])),
                ("KR_ADDRESS",      entity_present(text, RX_ADDR),  ("<ADDRESS>" in masked) or ("<ADDR_DETAIL>" in masked)),
                ("EMAIL_ADDRESS",   entity_present(text, RX_EMAIL), token_present(masked, EXPECT_TOKENS["EMAIL_ADDRESS"])),
                ("CREDIT_CARD",     entity_present(text, RX_CARD),  token_present(masked, EXPECT_TOKENS["CREDIT_CARD"])),
                ("SECRET_KEY",      entity_present(text, RX_SECR),  token_present(masked, EXPECT_TOKENS["SECRET_KEY"])),
                ("IP_ADDRESS",      entity_present(text, RX_IP),    token_present(masked, EXPECT_TOKENS["IP_ADDRESS"])),
                ("KR_BANK_ACCOUNT", entity_present(text, RX_BANK),  token_present(masked, EXPECT_TOKENS["KR_BANK_ACCOUNT"])),
                ("KR_BIZNO",        entity_present(text, RX_BIZNO), token_present(masked, EXPECT_TOKENS["KR_BIZNO"])),
                ("SENSITIVE_CONFIG",entity_present(text, RX_CONF),  token_present(masked, EXPECT_TOKENS["SENSITIVE_CONFIG"])),
            ]

            for ent, expected, got in checks:
                total_checks += 1
                if expected and got: stats[ent]["TP"] += 1
                elif expected and not got: stats[ent]["FN"] += 1
                elif not expected and got: stats[ent]["FP"] += 1

    # 엔터티별 출력
    print("\n=== Entity-wise Report ===")
    total_tp=total_fp=total_fn=0
    for ent, s in stats.items():
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
    assert f1 >= 0.90, f"Overall F1 too low: {f1:.3f}"
