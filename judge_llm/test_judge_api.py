#!/usr/bin/env python3
"""
Judge 파이프라인 통합 테스트 러너
- 환경변수:
  - API_URL   (default: http://localhost:8081/api/v1/ai/training)
  - API_TOKEN (optional: Bearer 토큰)
- 사용:
  $ python test_judge_api.py
  $ API_TOKEN=abc123 python test_judge_api.py
  $ API_URL=http://127.0.0.1:8081/api/v1/ai/training python test_judge_api.py
"""
import os, sys, json, time
from datetime import datetime
import requests

API_URL   = os.getenv("API_URL", "http://localhost:8081/api/v1/ai/training").rstrip("/")
API_TOKEN = os.getenv("API_TOKEN", "").strip()

def hdr():
    h = {"Content-Type": "application/json"}
    if API_TOKEN:
        h["Authorization"] = f"Bearer {API_TOKEN}"
    return h

def post_batch(items, batch_id=None, sync=False, title=""):
    params = {"sync": "1"} if sync else None
    payload = {"batchId": batch_id or f"demo-{int(time.time())}", "items": items}
    r = requests.post(API_URL, headers=hdr(), json=payload, params=params, timeout=120)
    print(f"\n=== [{title or '테스트'}] ===")
    print("Status:", r.status_code)
    try:
        data = r.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception:
        print(r.text)
        data = None
    # 비동기면 202 기대, 동기면 200 기대
    expect = 200 if sync else 202
    if r.status_code != expect:
        print(f"[WARN] expected HTTP {expect} but got {r.status_code}")
    return r.status_code, data

# ---------- 케이스 빌더들 ----------
def case_normal_highscore():
    return [
        {
            "pair_id": "ok-001",
            "prompt": "간단한 수학 문제입니다. 12 + 30은 얼마인가요?",
            "answer": "42",
            "meta": {"topic":"math", "lang":"ko"}
        }
    ]

def case_borderline_mid():
    return [
        {
            "pair_id": "edge-001",
            "question": "이 문제의 정답은 무엇일까요? (근거 포함)",
            "answerUser": "정답일 수도 있고 아닐 수도 있습니다."
        }
    ]

def case_empty_answer():
    return [
        {
            "pair_id": "empty-001",
            "q": "아무 대답도 하지 않으면 어떻게 평가되나요?",
            "answer_user": ""
        }
    ]

def case_pii_masking_trainable():
    return [
        {
            "pair_id": "pii-001",
            "prompt": "내 휴대폰 번호 010-1234-5678와 이메일 user@mail.com은 제거하고, 12+30 결과만 답해줘.",
            "answer": "정답은 42입니다. 카드 4111-1111-1111-1111 정보는 삭제했습니다. 주민번호 900101-1234567도 제거.",
            "note": "전화/이메일/카드/주민번호 포함 -> 마스킹 기대"
        }
    ]

def case_key_variants_mixed():
    return [
        {
            "_id": "mix-001",
            "question": "SSAFY 연락처 010-9999-0000 를 지우고, 2+2는?",
            "answerTrain": "4",
            "context": {"team": "A309", "tag": ["masking","keys"]},
        },
        {
            "id": "mix-002",
            "q": "이메일 abc.def+z@domain.kr 는 제거하고, 5*5?",
            "a_user": "25 입니다.",
            "extra": 123
        }
    ]

def case_pii_in_prompt_good_answer():
    return [
        {
            "pair_id": "pii-q-good-a-001",
            "prompt": "내 이메일은 user@mail.com, 전화 010-1234-5678이야. 근데 12+30 결과만 말해줘.",
            "answer": "42"
        }
    ]


def case_pii_in_both_prompt_and_answer():
    return [
        {
            "pair_id": "pii-q-a-002",
            "prompt": "카드번호 4111-1111-1111-1111 언급돼 있지만, 5*5 결과만 필요해.",
            "answer": "결과는 25입니다. 제 전화는 010-9876-5432 에요."  # 답변에도 PII
        }
    ]


def case_unauthorized():
    return [{"pair_id": "auth-001", "prompt": "2+3?", "answer": "5"}]

# ---------- 실행 시나리오 ----------
def main():
    print(f"[INFO] API_URL={API_URL} token={'set' if bool(API_TOKEN) else 'not-set'} at {datetime.now().isoformat()}")

    # 1) 비동기(202)
    post_batch(case_normal_highscore(), title="비동기: 정상 프롬프트 (학습 True 기대)", sync=False)
    post_batch(case_borderline_mid(),  title="비동기: 애매한 답변 (학습 False 기대)", sync=False)
    post_batch(case_empty_answer(),    title="비동기: 빈 답변 (학습 False 기대)",   sync=False)

    # 2) 동기(200)
    post_batch(case_normal_highscore(), title="동기: 정상 프롬프트 (업서트/트리거 확인)", sync=True)
    post_batch(case_borderline_mid(),   title="동기: 애매한 답변",                    sync=True)
    post_batch(case_empty_answer(),     title="동기: 빈 답변",                        sync=True)

    # 3) 마스킹 검증(동기)
    post_batch(case_pii_masking_trainable(), title="동기: PII 마스킹 + 학습 True 기대", sync=True)

    # 4) 원본 키 유지 + 값만 마스킹(동기)
    post_batch(case_key_variants_mixed(), title="동기: 키 다양성(원본 키 유지 + 마스킹 치환)", sync=True)

    # 5) 인증 실패 경로(옵션)
    if API_TOKEN:
        payload = {"batchId": "auth-check", "items": case_unauthorized()}
        r = requests.post(API_URL, headers={"Content-Type":"application/json"}, json=payload, timeout=30)
        print("\n=== [인증 실패 경로(의도적 무토큰)] ===")
        print("Status:", r.status_code)
        try:
            print(json.dumps(r.json(), ensure_ascii=False, indent=2))
        except Exception:
            print(r.text)

    # 6) 상호보완 실험(동기) — 디버그 서브스코어 보면서 확인
    post_batch(case_pii_in_prompt_good_answer(), title="동기: PII는 질문에만, 답변은 깔끔(고득점 기대)", sync=True)
    post_batch(case_pii_in_both_prompt_and_answer(), title="동기: PII가 질문+답변 모두 존재(Practices 감점)", sync=True)

    print("\n[INFO] 테스트 완료.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
