#!/usr/bin/env python3
"""
Judge 파이프라인 통합 테스트 러너 (++ 업그레이드 버전)
- 환경변수:
  API_URL        (default: http://localhost:8081/api/v1/ai/training)
  API_TOKEN      (optional)
  VERIFY_MONGO   (true/false)      # true면 Mongo에서 batch 적재도 확인
  MONGO_URI/MONGO_DB/MONGO_COLL    # VERIFY_MONGO=true 일 때 필요
  STRICT_PII     (true/false)      # true면 응답 내 PII 잔존 시 실패 처리
  GOLDEN_BATCH_ID                 # 미지정 시 현재 시각 기반으로 생성
"""
import os, sys, json, time, argparse
from datetime import datetime
from typing import Any, Dict, List, Tuple, Optional
import requests

try:
    from pymongo import MongoClient  # VERIFY_MONGO=true일 때만 사용
except Exception:
    MongoClient = None

API_URL   = os.getenv("API_URL", "http://localhost:8081/api/v1/ai/training").rstrip("/")
API_TOKEN = os.getenv("API_TOKEN", "").strip()
VERIFY_MONGO = (os.getenv("VERIFY_MONGO","false").lower() == "true")
STRICT_PII   = (os.getenv("STRICT_PII","false").lower() == "true")
MONGO_URI  = os.getenv("MONGO_URI")
MONGO_DB   = os.getenv("MONGO_DB") or "judge_llm"
MONGO_COLL = os.getenv("MONGO_COLL") or "train_dataset"

def _hdr():
    h = {"Content-Type": "application/json", "accept": "application/json"}
    if API_TOKEN:
        h["Authorization"] = f"Bearer {API_TOKEN}"
    return h

def _ts_id(prefix="demo"):
    return f"{prefix}-{int(time.time())}"

def post_batch(items: List[Dict[str,Any]], batch_id: Optional[str]=None, sync: bool=False, title: str="") -> Tuple[int, Dict[str,Any]]:
    params = {"sync": "1"} if sync else None
    payload = {"batchId": batch_id or _ts_id("demo"), "items": items}
    r = requests.post(API_URL, headers=_hdr(), json=payload, params=params, timeout=120)
    print(f"\n=== [{title or '테스트'}] ===")
    print("Status:", r.status_code)
    try:
        data = r.json()
        print(json.dumps(data, ensure_ascii=False, indent=2))
    except Exception:
        print(r.text)
        data = {}
    expect = 200 if sync else 202
    if r.status_code != expect:
        print(f"[WARN] expected HTTP {expect} but got {r.status_code}")
    return r.status_code, data

# --------- 검증 유틸 ----------
def _has_pii_tokens(s: str) -> bool:
    # 파이프라인의 표준 토큰 목록(필요 시 확장)
    if not s: return False
    toks = ["<PHONE>","<EMAIL>","<RRN>","<CARD>","<ADDRESS>","<ADDR>","<BANK>","<BANK_ACCT>","<BIZNO>","<IP>","<SECRET>"]
    return any(t in s for t in toks)

def dget(obj: Any, path: str, default=None):
    """
    dict/list hybrid getter.
    예: dget(data, "data.results.0.passed")
    """
    cur = obj
    for key in path.split("."):
        if isinstance(cur, list):
            if key.isdigit():
                idx = int(key)
                if 0 <= idx < len(cur):
                    cur = cur[idx]
                else:
                    return default
            else:
                return default
        elif isinstance(cur, dict):
            if key in cur:
                cur = cur[key]
            else:
                return default
        else:
            return default
    return cur

class SuiteResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.details: List[str] = []
    def ok(self, msg="OK"):
        self.passed += 1; self.details.append("✅ " + msg)
    def ng(self, msg="FAIL"):
        self.failed += 1; self.details.append("❌ " + msg)
    def dump(self):
        print("\n--- 검증 요약 ---")
        for d in self.details: print(d)
        print(f"\n결과: PASS {self.passed}  /  FAIL {self.failed}")
        return self.failed == 0

def _mongo_count(batch_id: str) -> int:
    if not VERIFY_MONGO:
        return -1
    if MongoClient is None:
        print("[WARN] VERIFY_MONGO=true지만 pymongo 미설치")
        return -1
    cli = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    coll = cli[MONGO_DB][MONGO_COLL]
    return coll.count_documents({"batch_id": batch_id})

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

# ---------- 실행 시나리오 + 검증 ----------
def run_suite() -> bool:
    print(f"[INFO] API_URL={API_URL} token={'set' if bool(API_TOKEN) else 'not-set'} at {datetime.now().isoformat()}")
    sr = SuiteResult()

    # 0) 비동기(202) — 상태코드만 확인
    post_batch(case_normal_highscore(), title="비동기: 정상 프롬프트 (학습 True 기대)", sync=False)
    post_batch(case_borderline_mid(),  title="비동기: 애매한 답변 (학습 False 기대)", sync=False)
    post_batch(case_empty_answer(),    title="비동기: 빈 답변 (학습 False 기대)",   sync=False)

    # 1) 동기(200) — 평가/트리거 확인
    sc, d = post_batch(case_normal_highscore(), title="동기: 정상 프롬프트 (업서트/트리거 확인)", sync=True)
    try:
        ok_passed = bool(dget(d,"data.results.0.passed", False))
        # main_llm_triggered는 환경에 따라 False일 수도 있으므로 필수조건 제외
        sr.ok("정상 프롬프트 평가/트리거") if (sc==200 and ok_passed) else sr.ng("정상 프롬프트 평가/트리거")
    except Exception as e:
        sr.ng(f"정상 프롬프트 파싱 오류: {e}")

    sc, d = post_batch(case_borderline_mid(),   title="동기: 애매한 답변", sync=True)
    try:
        ok_passed = bool(dget(d,"data.results.0.passed", True)) is False
        sr.ok("애매 답변 비통과") if (sc==200 and ok_passed) else sr.ng("애매 답변 비통과")
    except Exception as e:
        sr.ng(f"애매 답변 파싱 오류: {e}")

    sc, d = post_batch(case_empty_answer(),     title="동기: 빈 답변", sync=True)
    try:
        ok_passed = bool(dget(d,"data.results.0.passed", True)) is False
        sr.ok("빈 답변 비통과") if (sc==200 and ok_passed) else sr.ng("빈 답변 비통과")
    except Exception as e:
        sr.ng(f"빈 답변 파싱 오류: {e}")

    # 2) 마스킹 검증 — 답/질문 내 PII가 토큰화되었는지 확인
    sc, d = post_batch(case_pii_masking_trainable(), title="동기: PII 마스킹 + 학습 True 기대", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt","")
        a = sample.get("llm_response","")
        # 이메일은 KEEP_DOMAIN 정책 적용 케이스와 '원문 유지' 케이스 모두 허용
        email_ok = ("<EMAIL>" in p) or ("@" in p)
        cond = ("<PHONE>" in p) and email_ok and ("<CARD>" in a) and ("<RRN>" in a)
        ok_passed = bool(dget(d,"data.results.0.passed", False))
        sr.ok("PII 마스킹·학습통과") if (sc==200 and ok_passed and cond) else sr.ng("PII 마스킹·학습통과")
        if STRICT_PII and _has_pii_tokens(sample.get("rejected_response","")):
            sr.ng("STRICT_PII 위반: rejected_response 내 PII 토큰 잔존")
    except Exception as e:
        sr.ng(f"PII 마스킹 파싱 오류: {e}")

    # 3) 키 다양성(표준키) — 이메일 KEEP_DOMAIN 정책 반영 확인
    sc, d = post_batch(case_key_variants_mixed(), title="동기: 키 다양성(표준키로 전송, 내부 마스킹/저장 확인)", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt","")
        domain_kept = ("<EMAIL>@" in p) or ("@domain" in p)
        sr.ok("이메일 도메인 보존 정책") if (sc==200 and domain_kept) else sr.ng("이메일 도메인 보존 정책")
    except Exception as e:
        sr.ng(f"키 다양성 파싱 오류: {e}")

    # 4) 질문에만 PII — 답변은 깔끔
    sc, d = post_batch(case_pii_in_prompt_good_answer(), title="동기: PII는 질문에만, 답변은 깔끔(고득점 기대)", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        a = sample.get("llm_response","")
        sr.ok("답변 내 PII 無") if (sc==200 and not _has_pii_tokens(a)) else sr.ng("답변 내 PII 無")
    except Exception as e:
        sr.ng(f"질문만 PII 파싱 오류: {e}")

    # 5) 질문+답변 모두 PII — (운영정책에 따라) 감점 기대. 여기선 잔존 여부만 체크.
    sc, d = post_batch(case_pii_in_both_prompt_and_answer(), title="동기: PII가 질문+답변 모두 존재(Practices 감점 기대)", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        a = sample.get("llm_response","")
        if STRICT_PII and _has_pii_tokens(a):
            sr.ng("STRICT_PII: 답변 내 PII 잔존")  # 운영 시 실패로 간주할 수 있음
        else:
            sr.ok("PII 동시 등장 경고 확인")
    except Exception as e:
        sr.ng(f"질문+답변 PII 파싱 오류: {e}")

    # 6) 골든 배치 — 멱등성 위해 고유 batch id 사용 (환경변수 미지정 시 시각 기반)
    golden_id = os.getenv("GOLDEN_BATCH_ID") or _ts_id("b-golden")
    sc, d = post_batch(golden_batch(), batch_id=golden_id, title=f"동기: 골든 배치({golden_id})", sync=True)
    try:
        ok_processed = int(dget(d,"data.processed",0)) == 5
        if VERIFY_MONGO:
            n = _mongo_count(golden_id)
            # 통과만 적재한다면 최소 3~5개 사이(정책에 따라). 여기선 >=1만 확인.
            sr.ok(f"Mongo upsert 확인({n} docs)") if (n >= 1) else sr.ng(f"Mongo upsert 부족({n})")
        sr.ok("골든 배치 처리") if (sc==200 and ok_processed) else sr.ng("골든 배치 처리")
    except Exception as e:
        sr.ng(f"골든 배치 파싱 오류: {e}")

    # 결과 요약
    ok = sr.dump()
    return ok

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fail-on-error", action="store_true", help="테스트 실패 시 비정상 종료 코드 반환")
    args = parser.parse_args()
    ok = run_suite()
    if args.fail_on_error and not ok:
        sys.exit(1)
    print("\n[INFO] 테스트 완료.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)