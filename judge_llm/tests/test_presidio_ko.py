# tests/test_presidio_ko.py
# presidio 테스트
import json, pathlib, os, re
from api.app.masking.presidio_adapter import PresidioAdapter

SAMPLES = pathlib.Path("tests/samples.jsonl")

# 골든 규칙: 마스킹 결과에 원하는 토큰이 들어있는지만 판정 (간단/명확)
EXPECT_TOKENS = {
    "KR_PHONE_NUMBER": "<PHONE>",
    "KR_RRN": "<RRN>",
    "KR_ADDRESS": "<ADDRESS>",
    "EMAIL_ADDRESS": "<EMAIL>@",
    "CREDIT_CARD": "<CARD>",
    "SECRET_KEY": "<SECRET>",
}

# 탐지 기대치 간단 판별용 정규식 (생성기에 맞춤)
RX_PHONE = re.compile(r"(0?10(?:[-.\s]?\d{4}){2}|0[2-6]\d?[-.\s]?\d{3,4}[-.\s]?\d{4})")
RX_RRN   = re.compile(r"\d{6}-\d{7}|\b\d{13}\b")
RX_EMAIL = re.compile(r"[\w.\-+%]+@[\w.\-]+\.[A-Za-z]{2,24}|\(at\)|\[at\]")
RX_ADDR  = re.compile(r"(서울특별시|부산광역시|경기도|인천광역시|대전광역시|세종특별자치시|제주특별자치도)")
RX_CARD  = re.compile(r"\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b|\b\d{13,19}\b")
RX_SECR  = re.compile(r"AKIA[0-9A-Z]{16}|AIza|eyJhbGciOi|-----BEGIN .*PRIVATE KEY-----|[0-9a-f]{7,40}|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b")

def entity_present(orig, rx): 
    return bool(rx.search(orig))
def token_present(masked, token): 
    return token in masked

def test_presidio_ko_batch():
    os.environ["ADDRESS_POLICY"] = os.getenv("ADDRESS_POLICY", "CITY_GU")
    os.environ["EMAIL_POLICY"]   = os.getenv("EMAIL_POLICY", "KEEP_DOMAIN")

    assert SAMPLES.exists(), "Run: python tests/generate_samples.py 1000"

    adapter = PresidioAdapter()
    TP=FP=FN=TN=0
    N=0

    with SAMPLES.open(encoding="utf-8") as f:
        for line in f:
            record = json.loads(line)
            text = record["text"]
            masked = adapter.anonymize(text)

            # 각 엔터티마다 기대/실제 비교
            checks = [
                ("KR_PHONE_NUMBER", entity_present(text, RX_PHONE), token_present(masked, EXPECT_TOKENS["KR_PHONE_NUMBER"])),
                ("KR_RRN",          entity_present(text, RX_RRN),   token_present(masked, EXPECT_TOKENS["KR_RRN"])),
                ("KR_ADDRESS",      entity_present(text, RX_ADDR),  ("<ADDRESS>" in masked) or ("<ADDR_DETAIL>" in masked)),
                ("EMAIL_ADDRESS",   entity_present(text, RX_EMAIL), token_present(masked, EXPECT_TOKENS["EMAIL_ADDRESS"])),
                ("CREDIT_CARD",     entity_present(text, RX_CARD),  token_present(masked, EXPECT_TOKENS["CREDIT_CARD"])),
                ("SECRET_KEY",      entity_present(text, RX_SECR),  token_present(masked, EXPECT_TOKENS["SECRET_KEY"])),
            ]

            for _, expected, got in checks:
                if expected and got:   TP += 1
                elif (not expected) and (not got): TN += 1
                elif expected and (not got): FN += 1
                else: FP += 1
                N += 1

    precision = TP / (TP + FP) if TP+FP else 1.0
    recall    = TP / (TP + FN) if TP+FN else 1.0
    f1        = (2*precision*recall)/(precision+recall) if precision+recall else 0.0
    accuracy  = (TP + TN) / N if N else 1.0

    print(f"\nSamples={N//6}  TP={TP} FP={FP} FN={FN} TN={TN}")
    print(f"Precision={precision:.4f}  Recall={recall:.4f}  F1={f1:.4f}  Accuracy={accuracy:.4f}")

    # 목표(가이드): 정확도 ≥ 0.90, F1 ≥ 0.90 권장
    assert accuracy >= 0.90, f"Accuracy too low: {accuracy:.3f}"