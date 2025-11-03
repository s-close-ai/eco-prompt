#!/usr/bin/env python3
"""
Judge 파이프라인 통합 테스트 러너 (items 스키마)
- 환경변수:
  - API_URL   (default: http://localhost:8081/api/v1/ai/training)
  - API_TOKEN (optional: Bearer 토큰)
"""
import os, sys, json, time
from datetime import datetime
import requests

API_URL   = os.getenv("API_URL", "http://localhost:8081/api/v1/ai/training").rstrip("/")
API_TOKEN = os.getenv("API_TOKEN", "").strip()

def hdr():
    h = {"Content-Type": "application/json", "accept": "application/json"}
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
    expect = 200 if sync else 202
    if r.status_code != expect:
        print(f"[WARN] expected HTTP {expect} but got {r.status_code}")
    return r.status_code, data

# ---------- 케이스 빌더들 (표준 스키마: message_id, prompt, llm_response, rejected_response) ----------
def case_normal_highscore():
    return [
        {
            "message_id": "ok-001",
            "prompt": "간단한 수학 문제입니다. 12 + 30은 얼마인가요?",
            "llm_response": "42",
            "rejected_response": ""
        }
    ]

def case_borderline_mid():
    return [
        {
            "message_id": "edge-001",
            "prompt": "이 문제의 정답은 무엇일까요? (근거 포함)",
            "llm_response": "정답일 수도 있고 아닐 수도 있습니다.",
            "rejected_response": ""
        }
    ]

def case_empty_answer():
    return [
        {
            "message_id": "empty-001",
            "prompt": "아무 대답도 하지 않으면 어떻게 평가되나요?",
            "llm_response": "",
            "rejected_response": ""
        }
    ]

def case_pii_masking_trainable():
    return [
        {
            "message_id": "pii-001",
            "prompt": "내 휴대폰 번호 010-1234-5678와 이메일 user@mail.com은 제거하고, 12+30 결과만 답해줘.",
            "llm_response": "정답은 42입니다. 카드 4111-1111-1111-1111 정보는 삭제했습니다. 주민번호 900101-1234567도 제거.",
            "rejected_response": ""
        }
    ]

def case_key_variants_mixed():
    # (원래 키 변형 케이스였던 걸 표준 키로 통일)
    return [
        {
            "message_id": "mix-001",
            "prompt": "SSAFY 연락처 010-9999-0000 를 지우고, 2+2는?",
            "llm_response": "4",
            "rejected_response": ""
        },
        {
            "message_id": "mix-002",
            "prompt": "이메일 abc.def+z@domain.kr 는 제거하고, 5*5?",
            "llm_response": "25 입니다.",
            "rejected_response": ""
        }
    ]

def case_pii_in_prompt_good_answer():
    return [
        {
            "message_id": "pii-q-good-a-001",
            "prompt": "내 이메일은 user@mail.com, 전화 010-1234-5678이야. 근데 12+30 결과만 말해줘.",
            "llm_response": "42",
            "rejected_response": ""
        }
    ]

def case_pii_in_both_prompt_and_answer():
    return [
        {
            "message_id": "pii-q-a-002",
            "prompt": "카드번호 4111-1111-1111-1111 언급돼 있지만, 5*5 결과만 필요해.",
            "llm_response": "결과는 25입니다. 제 전화는 010-9876-5432 에요.",
            "rejected_response": ""
        }
    ]

def case_unauthorized():
    return [
        {
            "message_id": "auth-001",
            "prompt": "2+3?",
            "llm_response": "5",
            "rejected_response": ""
        }
    ]

def golden_batch():
    return [
        {
            "message_id": "g1",
            "prompt": "SSAFY의 주요 목표와 운영 구조를 5문장 내로 요약해줘.",
            "llm_response": (
                "SSAFY는 실무형 SW 인재 양성을 목표로 1년 풀타임 교육을 제공합니다. "
                "기초→심화→자율프로젝트로 이어지는 단계형 커리큘럼과 기업 협업을 포함합니다. "
                "팀 프로젝트와 코드 리뷰로 문제해결·커뮤니케이션 역량을 강화합니다. "
                "지역 캠퍼스를 통해 생태계 확산과 채용 연계를 지원합니다. "
                "운영은 주간 스프린트·데모데이·멘토링으로 체계적으로 관리됩니다."
            ),
            "rejected_response": ""
        },
        {
            "message_id": "g2",
            "prompt": "SSAFY가 청년에게 주는 긍정적 영향 3가지를 근거와 함께 간결히 설명해줘.",
            "llm_response": (
                "① 커리큘럼과 코드리뷰로 비전공자도 실무 기초를 빠르게 확보. "
                "② 협업 프로젝트로 문제정의·설계·테스트 전 과정 경험. "
                "③ 기업 협업/채용 연계로 취업 전환율 상승."
            ),
            "rejected_response": ""
        },
        {
            "message_id": "g3",
            "prompt": "교육 과정의 핵심 평가 지표 세 가지를 말해줘(정의 포함).",
            "llm_response": "수료율, 만족도, 프로젝트 완성도.",
            "rejected_response": ""
        },
        {
            "message_id": "g4",
            "prompt": "내 번호 010-1234-5678과 메일 user@mail.com은 무시하고 SSAFY 데모데이 소개해줘.",
            "llm_response": (
                "데모데이는 팀이 결과물을 시연·피드백 받는 자리입니다. "
                "제 카드 4111-1111-1111-1111은 삭제해줘."
            ),
            "rejected_response": ""
        },
        {
            "message_id": "g5",
            "prompt": "협업 프로젝트에서 역할 분담의 원칙 3가지를 말해줘.",
            "llm_response": "역할 명확성·상호 리뷰·스프린트 태스크 쪼개기가 핵심입니다.",
            "rejected_response": ""
        }
    ]

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

    # 4) 표준키로 통일한 키 다양성(동기)
    post_batch(case_key_variants_mixed(), title="동기: 키 다양성(표준키로 전송, 내부 마스킹/저장 확인)", sync=True)

    # 5) 인증 실패 경로(옵션: 토큰 없이 호출)
    if API_TOKEN:
        payload = {"batchId": "auth-check", "items": case_unauthorized()}
        r = requests.post(API_URL, headers={"Content-Type":"application/json", "accept":"application/json"}, json=payload, timeout=30)
        print("\n=== [인증 실패 경로(의도적 무토큰)] ===")
        print("Status:", r.status_code)
        try:
            print(json.dumps(r.json(), ensure_ascii=False, indent=2))
        except Exception:
            print(r.text)

    # 6) 상호보완 실험(동기)
    post_batch(case_pii_in_prompt_good_answer(), title="동기: PII는 질문에만, 답변은 깔끔(고득점 기대)", sync=True)
    post_batch(case_pii_in_both_prompt_and_answer(), title="동기: PII가 질문+답변 모두 존재(Practices 감점 기대)", sync=True)

    # 7) 골든 배치(동기) — 종합 검증
    post_batch(golden_batch(), batch_id="b-golden-001", title="동기: 골든 배치", sync=True)

    print("\n[INFO] 테스트 완료.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
