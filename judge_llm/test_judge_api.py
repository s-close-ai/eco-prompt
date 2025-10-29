import os
import json
import requests

API_URL = os.getenv("API_URL", "http://127.0.0.1:8081/api/v1/ai/training?sync=1")
API_TOKEN = os.getenv("API_TOKEN", "")
BATCH_ID = f"demo-{os.getpid()}"

headers = {"Content-Type": "application/json"}
if API_TOKEN:
    headers["Authorization"] = f"Bearer {API_TOKEN}"


def pretty(res):
    print(json.dumps(res, ensure_ascii=False, indent=2))


def post_batch(items, label):
    print(f"\n=== [{label}] ===")
    payload = {"batchId": BATCH_ID, "items": items}
    r = requests.post(API_URL, headers=headers, json=payload, timeout=60)
    print(f"Status: {r.status_code}")
    try:
        data = r.json()
        pretty(data)
    except Exception:
        print(r.text)


# ✅ 1. 정상 케이스
post_batch(
    [
        {
            "pair_id": "ok-001",
            "prompt": "간단한 수학 문제입니다. 12 + 30은 얼마인가요?",
            "answer": "42",
        }
    ],
    "정상 프롬프트",
)

# ⚠️ 2. 애매한 답변 (낮은 점수 예상)
post_batch(
    [
        {
            "pair_id": "edge-001",
            "prompt": "다음 글을 요약하세요: '고양이는 동물이며 온순한 성격입니다.'",
            "answer": "좋아요",
        }
    ],
    "애매한 답변",
)

# ❌ 3. 빈 답변 (recovered 확인)
post_batch(
    [
        {
            "pair_id": "empty-001",
            "prompt": "이 문장을 요약하세요.",
            "answer": "",
        }
    ],
    "빈 답변",
)
