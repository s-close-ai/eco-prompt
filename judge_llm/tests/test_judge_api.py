#!/usr/bin/env python3
"""
Judge 파이프라인 통합 테스트 러너 (++ 업그레이드 버전)

환경변수:
  # 공통
  API_URL                (default: http://localhost:8081/api/v1/ai/training)
  API_TOKEN              (optional)

  # CloseAI 포맷 전송용
  CLOSEAI_URL            (optional; 기본: API_URL의 /closeai 엔드포인트로 유도)
  CLOSEAI_DIRECT_ARRAY   (true/false, default: false)
    - true : CLOSEAI 입력 배열을 API_URL 로 그대로 POST (서버가 배열 입력 수용할 때)
    - false: CLOSEAI_URL (또는 API_URL + '/closeai') 로 POST

  # Mongo 검증(표준 배치 전용)
  VERIFY_MONGO           (true/false, default: false)
  MONGO_URI/MONGO_DB/MONGO_COLL

  # 엄격 PII 검증
  STRICT_PII             (true/false, default: false)

  # 골든 배치 ID 고정(선택)
  GOLDEN_BATCH_ID

실행 예시:
  python tests/test_judge_api.py --suite all
  API_URL=http://112.171.56.247:8083/api/v1/ai/training python tests/test_judge_api.py --suite standard
  CLOSEAI_URL=http://112.171.56.247:8083/api/v1/ai/training/closeai python tests/test_judge_api.py --suite closeai
"""

import os, sys, json, time, argparse
from datetime import datetime
from typing import Any, Dict, List, Tuple, Optional
import requests

try:
    from pymongo import MongoClient  # VERIFY_MONGO=true일 때만 사용
except Exception:
    MongoClient = None

# -------------------- 환경 --------------------
API_URL   = os.getenv("API_URL", "http://localhost:8081/api/v1/ai/training").rstrip("/")
API_TOKEN = os.getenv("API_TOKEN", "").strip()

# CloseAI 입력 전송 설정
CLOSEAI_URL = os.getenv("CLOSEAI_URL", (API_URL + "/closeai")).rstrip("/")
CLOSEAI_DIRECT_ARRAY = (os.getenv("CLOSEAI_DIRECT_ARRAY", "false").lower() == "true")

# Mongo 검증(표준 배치)
VERIFY_MONGO = (os.getenv("VERIFY_MONGO","false").lower() == "true")
MONGO_URI  = os.getenv("MONGO_URI")
MONGO_DB   = os.getenv("MONGO_DB") or "judge_llm"
MONGO_COLL = os.getenv("MONGO_COLL") or "train_dataset"

# PII 정책
STRICT_PII   = (os.getenv("STRICT_PII","false").lower() == "true")


# -------------------- HTTP 헬퍼 --------------------
def _hdr():
    h = {"Content-Type": "application/json", "accept": "application/json"}
    if API_TOKEN:
        h["Authorization"] = f"Bearer {API_TOKEN}"
    return h

def _ts_id(prefix="demo"):
    return f"{prefix}-{int(time.time())}"

def _post_json(url: str, payload: Any, params: Optional[Dict[str, Any]]=None, timeout=120) -> requests.Response:
    return requests.post(url, headers=_hdr(), json=payload, params=params, timeout=timeout)


# -------------------- 공통 유틸 --------------------
def _has_pii_tokens(s: str) -> bool:
    if not s: return False
    toks = ["<PHONE>","<EMAIL>","<RRN>","<CARD>","<ADDRESS>","<ADDR>","<BANK>","<BANK_ACCT>","<BIZNO>","<IP>","<SECRET>"]
    return any(t in s for t in toks)

def dget(obj: Any, path: str, default=None):
    """
    dict/list hybrid getter. 예: dget(data, "data.results.0.passed")
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


# -------------------- Mongo 검증 --------------------
def _mongo_count(batch_id: str) -> int:
    if not VERIFY_MONGO:
        return -1
    if MongoClient is None:
        print("[WARN] VERIFY_MONGO=true지만 pymongo 미설치")
        return -1
    cli = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
    coll = cli[MONGO_DB][MONGO_COLL]
    return coll.count_documents({"batch_id": batch_id})


# ===================================================
#  1) 표준 스키마 케이스 (message_id, prompt, llm_response, rejected_response)
# ===================================================
def post_batch(items: List[Dict[str,Any]], batch_id: Optional[str]=None, sync: bool=False, title: str="") -> Tuple[int, Dict[str,Any]]:
    params = {"sync": "1"} if sync else None
    payload = {"batchId": batch_id or _ts_id("demo"), "items": items}
    r = _post_json(API_URL, payload, params=params)
    print(f"\n=== [{title or '테스트'}] ===")
    print("POST", API_URL)
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

# ---------- 표준 케이스 빌더 ----------
def case_normal_highscore():
    return [
        {"message_id": "ok-001","prompt": "간단한 수학 문제입니다. 12 + 30은 얼마인가요?","llm_response": "42","rejected_response": ""}
    ]

def case_borderline_mid():
    return [
        {"message_id": "edge-001","prompt": "이 문제의 정답은 무엇일까요? (근거 포함)","llm_response": "정답일 수도 있고 아닐 수도 있습니다.","rejected_response": ""}
    ]

def case_empty_answer():
    return [
        {"message_id": "empty-001","prompt": "아무 대답도 하지 않으면 어떻게 평가되나요?","llm_response": "","rejected_response": ""}
    ]

def case_pii_masking_trainable():
    return [
        {"message_id": "pii-001","prompt": "내 휴대폰 번호 010-1234-5678와 이메일 user@mail.com은 제거하고, 12+30 결과만 답해줘.","llm_response": "정답은 42입니다. 카드 4111-1111-1111-1111 정보는 삭제했습니다. 주민번호 900101-1234567도 제거.","rejected_response": ""}
    ]

def case_key_variants_mixed():
    return [
        {"message_id": "mix-001","prompt": "SSAFY 연락처 010-9999-0000 를 지우고, 2+2는?","llm_response": "4","rejected_response": ""},
        {"message_id": "mix-002","prompt": "이메일 abc.def+z@domain.kr 는 제거하고, 5*5?","llm_response": "25 입니다.","rejected_response": ""}
    ]

def case_pii_in_prompt_good_answer():
    return [
        {"message_id": "pii-q-good-a-001","prompt": "내 이메일은 user@mail.com, 전화 010-1234-5678이야. 근데 12+30 결과만 말해줘.","llm_response": "42","rejected_response": ""}
    ]

def case_pii_in_both_prompt_and_answer():
    return [
        {"message_id": "pii-q-a-002","prompt": "카드번호 4111-1111-1111-1111 언급돼 있지만, 5*5 결과만 필요해.","llm_response": "결과는 25입니다. 제 전화는 010-9876-5432 에요.","rejected_response": ""}
    ]

def golden_batch():
    return [
        {"message_id": "g1","prompt": "SSAFY의 주요 목표와 운영 구조를 5문장 내로 요약해줘.","llm_response":
            "SSAFY는 실무형 SW 인재 양성을 목표로 1년 풀타임 교육을 제공합니다. "
            "기초→심화→자율프로젝트로 이어지는 단계형 커리큘럼과 기업 협업을 포함합니다. "
            "팀 프로젝트와 코드 리뷰로 문제해결·커뮤니케이션 역량을 강화합니다. "
            "지역 캠퍼스를 통해 생태계 확산과 채용 연계를 지원합니다. "
            "운영은 주간 스프린트·데모데이·멘토링으로 체계적으로 관리됩니다.", "rejected_response": ""},
        {"message_id": "g2","prompt": "SSAFY가 청년에게 주는 긍정적 영향 3가지를 근거와 함께 간결히 설명해줘.","llm_response":
            "① 커리큘럼과 코드리뷰로 비전공자도 실무 기초를 빠르게 확보. "
            "② 협업 프로젝트로 문제정의·설계·테스트 전 과정 경험. "
            "③ 기업 협업/채용 연계로 취업 전환율 상승.","rejected_response": ""},
        {"message_id": "g3","prompt": "교육 과정의 핵심 평가 지표 세 가지를 말해줘(정의 포함).","llm_response": "수료율, 만족도, 프로젝트 완성도.","rejected_response": ""},
        {"message_id": "g4","prompt": "내 번호 010-1234-5678과 메일 user@mail.com은 무시하고 SSAFY 데모데이 소개해줘.","llm_response":
            "데모데이는 팀이 결과물을 시연·피드백 받는 자리입니다. "
            "제 카드 4111-1111-1111-1111은 삭제해줘.","rejected_response": ""},
        {"message_id": "g5","prompt": "협업 프로젝트에서 역할 분담의 원칙 3가지를 말해줘.","llm_response": "역할 명확성·상호 리뷰·스프린트 태스크 쪼개기가 핵심입니다.","rejected_response": ""}
    ]


# ===================================================
#  2) CloseAI 배열 포맷 케이스 (messageUUID 묶음: USER/AI/TRAIN)
# ===================================================
def post_closeai_batch(closeai_items: List[Dict[str, Any]], sync: bool=True, title: str="") -> Tuple[int, Dict[str, Any]]:
    """
    - CLOSEAI_DIRECT_ARRAY=true  : API_URL 로 배열을 그대로 POST (서버가 배열 수용 시)
    - CLOSEAI_DIRECT_ARRAY=false : CLOSEAI_URL (기본: API_URL+'/closeai') 로 POST
    """
    url = API_URL if CLOSEAI_DIRECT_ARRAY else CLOSEAI_URL
    params = {"sync": "1"} if sync else None
    r = _post_json(url, closeai_items, params=params)
    print(f"\n=== [{title or 'CloseAI 테스트'}] ===")
    print("POST", url)
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

# ---------- CloseAI 시나리오 빌더 7종 ----------
def closeai_set_basic_math():
    uuid = "closeai-basic-001"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content": "12+30은 얼마야?","status": "RECEIVED","chatting_id": 1,
         "created_at": "25.11.4 오전 10:00","updated_at": "25.11.4 오전 10:00"},
        {"messageUUID": uuid,"sender_type": "AI","content": "결과는 42입니다.","status": "DONE","chatting_id": 1},
        {"messageUUID": uuid,"sender_type": "TRAIN","content": "계산이 어려워요.","status": "DONE","chatting_id": 1},
    ]

def closeai_set_pii_trainable_complex():
    uuid = "closeai-pii-002"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content":
            "내 전화번호 010-2233-4455, 주민번호 900101-1234567, 회사 메일 jh.kim@company.co.kr 은 비공개로 해줘. "
            "계산 문제 하나 줄게. 125 * 8의 결과를 알려줘.","status": "RECEIVED","chatting_id": 2},
        {"messageUUID": uuid,"sender_type": "AI","content":
            "결과는 1000입니다. 요청하신 개인정보(전화, 이메일, 주민번호)는 표시하지 않았습니다.","status": "DONE","chatting_id": 2},
        {"messageUUID": uuid,"sender_type": "TRAIN","content":
            "010-2233-4455는 유효한 번호입니다. 메일 jh.kim@company.co.kr 로 결과 전송 완료.","status": "DONE","chatting_id": 2},
    ]

def closeai_set_mixed_english_korean():
    uuid = "closeai-mix-003"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content": "Explain briefly what SSAFY program is in Korean.","status": "RECEIVED","chatting_id": 3},
        {"messageUUID": uuid,"sender_type": "AI","content":
            "SSAFY는 삼성 청년 SW 아카데미로, 청년들에게 실무형 SW 교육을 제공하는 프로그램입니다.","status": "DONE","chatting_id": 3},
        {"messageUUID": uuid,"sender_type": "TRAIN","content":
            "It’s a Samsung program for young software learners.","status": "DONE","chatting_id": 3},
    ]

def closeai_set_customer_complaint():
    uuid = "closeai-complaint-004"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content":
            "배송이 너무 늦어요. 3일 전에 주문했는데 아직도 안 왔어요. 010-9988-7766 번호로 빨리 연락 주세요.","status": "RECEIVED","chatting_id": 4},
        {"messageUUID": uuid,"sender_type": "AI","content":
            "불편을 드려 죄송합니다. 주문 상태를 확인 후 빠르게 안내드리겠습니다.","status": "DONE","chatting_id": 4},
        {"messageUUID": uuid,"sender_type": "TRAIN","content":
            "이런! 진짜 너무하네요. 왜 이렇게 늦는 거죠? 010-9988-7766로 연락주세요.","status": "DONE","chatting_id": 4},
    ]

def closeai_set_sensitive_address():
    uuid = "closeai-sensitive-005"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content":
            "우리집은 서울특별시 강남구 테헤란로 123, 계좌는 1002-333-44444 농협이야. 이 정보는 숨기고 우리 동네 날씨 알려줘.","status": "RECEIVED","chatting_id": 5},
        {"messageUUID": uuid,"sender_type": "AI","content":
            "오늘 강남구 날씨는 맑고 기온은 17도입니다. 주소나 계좌 정보는 표시하지 않았습니다.","status": "DONE","chatting_id": 5},
        {"messageUUID": uuid,"sender_type": "TRAIN","content":
            "서울특별시 강남구 테헤란로 123에서 현재 비가 옵니다. 농협 1002-333-44444로 입금 확인 완료.","status": "DONE","chatting_id": 5},
    ]

def closeai_set_chain_question():
    uuid = "closeai-chain-006"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content":
            "2차전지의 주요 구성요소를 단계별로 설명해줘. 각 요소의 역할도 함께.","status": "RECEIVED","chatting_id": 6},
        {"messageUUID": uuid,"sender_type": "AI","content":
            "2차전지는 양극, 음극, 전해질, 분리막으로 구성됩니다. 양극은 리튬이온을 방출하고, 음극은 저장하며, 전해질은 이온 이동 통로입니다.","status": "DONE","chatting_id": 6},
        {"messageUUID": uuid,"sender_type": "TRAIN","content":
            "2차전지는 배터리야. 구성요소는 많아. 잘 모르겠어.","status": "DONE","chatting_id": 6},
    ]

def closeai_set_multi_pii_noise():
    uuid = "closeai-noise-007"
    return [
        {"messageUUID": uuid,"sender_type": "USER","content":
            "이건 테스트용이야! 이름은 김재희, 전화 010.8888.1111, 주민번호 920303-1234567, 이메일 jh_test@naver.com, "
            "주소는 부산광역시 해운대구 마린시티 123. 이거 다 가리고 3*7 계산만 해줘!!","status": "RECEIVED","chatting_id": 7},
        {"messageUUID": uuid,"sender_type": "AI","content":
            "정답은 21입니다. 개인정보는 표시하지 않았습니다.","status": "DONE","chatting_id": 7},
        {"messageUUID": uuid,"sender_type": "TRAIN","content":
            "21입니다. 그리고 김재희님, 010.8888.1111로 결과 전송했습니다.","status": "DONE","chatting_id": 7},
    ]


# ===================================================
#  3) 실행 시나리오
# ===================================================
def run_suite_standard() -> bool:
    print(f"[INFO] (STANDARD) API_URL={API_URL} token={'set' if bool(API_TOKEN) else 'not-set'} at {datetime.now().isoformat()}")
    sr = SuiteResult()

    # 비동기(202) — 상태코드만 확인
    post_batch(case_normal_highscore(), title="비동기: 정상 프롬프트 (학습 True 기대)", sync=False)
    post_batch(case_borderline_mid(),  title="비동기: 애매한 답변 (학습 False 기대)", sync=False)
    post_batch(case_empty_answer(),    title="비동기: 빈 답변 (학습 False 기대)",   sync=False)

    # 동기(200)
    sc, d = post_batch(case_normal_highscore(), title="동기: 정상 프롬프트 (업서트/트리거 확인)", sync=True)
    try:
        ok_passed = bool(dget(d,"data.results.0.passed", False))
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

    # 마스킹 검증
    sc, d = post_batch(case_pii_masking_trainable(), title="동기: PII 마스킹 + 학습 True 기대", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt",""); a = sample.get("llm_response","")
        email_ok = ("<EMAIL>" in p) or ("@" in p)
        cond = ("<PHONE>" in p) and email_ok and ("<CARD>" in a) and ("<RRN>" in a)
        ok_passed = bool(dget(d,"data.results.0.passed", False))
        sr.ok("PII 마스킹·학습통과") if (sc==200 and ok_passed and cond) else sr.ng("PII 마스킹·학습통과")
        if STRICT_PII and _has_pii_tokens(sample.get("rejected_response","")):
            sr.ng("STRICT_PII 위반: rejected_response 내 PII 토큰 잔존")
    except Exception as e:
        sr.ng(f"PII 마스킹 파싱 오류: {e}")

    # 이메일 도메인 보존
    sc, d = post_batch(case_key_variants_mixed(), title="동기: 키 다양성(표준키로 전송, 내부 마스킹/저장 확인)", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt","")
        domain_kept = ("<EMAIL>@" in p) or ("@domain" in p)
        sr.ok("이메일 도메인 보존 정책") if (sc==200 and domain_kept) else sr.ng("이메일 도메인 보존 정책")
    except Exception as e:
        sr.ng(f"키 다양성 파싱 오류: {e}")

    # 질문에만 PII
    sc, d = post_batch(case_pii_in_prompt_good_answer(), title="동기: PII는 질문에만, 답변은 깔끔(고득점 기대)", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        a = sample.get("llm_response","")
        sr.ok("답변 내 PII 無") if (sc==200 and not _has_pii_tokens(a)) else sr.ng("답변 내 PII 無")
    except Exception as e:
        sr.ng(f"질문만 PII 파싱 오류: {e}")

    # 질문+답변 모두 PII
    sc, d = post_batch(case_pii_in_both_prompt_and_answer(), title="동기: PII가 질문+답변 모두 존재(Practices 감점 기대)", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        a = sample.get("llm_response","")
        if STRICT_PII and _has_pii_tokens(a):
            sr.ng("STRICT_PII: 답변 내 PII 잔존")
        else:
            sr.ok("PII 동시 등장 경고 확인")
    except Exception as e:
        sr.ng(f"질문+답변 PII 파싱 오류: {e}")

    # 골든 배치
    golden_id = os.getenv("GOLDEN_BATCH_ID") or _ts_id("b-golden")
    sc, d = post_batch(golden_batch(), batch_id=golden_id, title=f"동기: 골든 배치({golden_id})", sync=True)
    try:
        ok_processed = int(dget(d,"data.processed",0)) == 5
        if VERIFY_MONGO:
            n = _mongo_count(golden_id)
            sr.ok(f"Mongo upsert 확인({n} docs)") if (n >= 1) else sr.ng(f"Mongo upsert 부족({n})")
        sr.ok("골든 배치 처리") if (sc==200 and ok_processed) else sr.ng("골든 배치 처리")
    except Exception as e:
        sr.ng(f"골든 배치 파싱 오류: {e}")

    return sr.dump()


def run_suite_closeai() -> bool:
    print(f"[INFO] (CLOSEAI) URL={CLOSEAI_URL if not CLOSEAI_DIRECT_ARRAY else API_URL} "
          f"direct_array={CLOSEAI_DIRECT_ARRAY} token={'set' if bool(API_TOKEN) else 'not-set'} at {datetime.now().isoformat()}")
    sr = SuiteResult()

    # 기본/정상
    sc, d = post_closeai_batch(closeai_set_basic_math(), title="동기: CloseAI 기본 수학", sync=True)
    sr.ok("CloseAI 기본 수학 응답") if sc==200 else sr.ng("CloseAI 기본 수학 응답")

    # 복합 PII 고득점 예상
    sc, d = post_closeai_batch(closeai_set_pii_trainable_complex(), title="동기: CloseAI 복합 PII 고득점", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt",""); a = sample.get("llm_response","")
        cond = ("<PHONE>" in p) and (("<EMAIL>" in p) or ("@" in p)) and (("<RRN>" in p) or ("<RRN>" in a))
        ok_passed = bool(dget(d,"data.results.0.passed", True))
        sr.ok("CloseAI 복합 PII 마스킹·통과") if (sc==200 and ok_passed and cond) else sr.ng("CloseAI 복합 PII 마스킹·통과")
    except Exception as e:
        sr.ng(f"CloseAI 복합 PII 파싱 오류: {e}")

    # 영문·한글 혼합
    sc, d = post_closeai_batch(closeai_set_mixed_english_korean(), title="동기: CloseAI mixed EN/KR", sync=True)
    sr.ok("CloseAI mixed EN/KR") if sc==200 else sr.ng("CloseAI mixed EN/KR")

    # 클레임 대응(전화 포함)
    sc, d = post_closeai_batch(closeai_set_customer_complaint(), title="동기: CloseAI 클레임 대응", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt","")
        sr.ok("CloseAI PHONE 마스킹") if (sc==200 and "<PHONE>" in p) else sr.ng("CloseAI PHONE 마스킹")
    except Exception as e:
        sr.ng(f"CloseAI 클레임 파싱 오류: {e}")

    # 주소/계좌 마스킹
    sc, d = post_closeai_batch(closeai_set_sensitive_address(), title="동기: CloseAI 주소/계좌", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt","")
        cond = ("<ADDRESS>" in p or "<ADDR>" in p) and ("<BANK>" in p or "<BANK_ACCT>" in p)
        sr.ok("CloseAI 주소/계좌 마스킹") if (sc==200 and cond) else sr.ng("CloseAI 주소/계좌 마스킹")
    except Exception as e:
        sr.ng(f"CloseAI 주소/계좌 파싱 오류: {e}")

    # 체인형 질의
    sc, d = post_closeai_batch(closeai_set_chain_question(), title="동기: CloseAI 체인형 질의", sync=True)
    sr.ok("CloseAI 체인형 질의 OK") if sc==200 else sr.ng("CloseAI 체인형 질의")

    # 노이즈 + PII 다발
    sc, d = post_closeai_batch(closeai_set_multi_pii_noise(), title="동기: CloseAI 노이즈+PII 다발", sync=True)
    try:
        sample = dget(d,"data.main_llm_ack.sample",{})
        p = sample.get("prompt",""); a = sample.get("llm_response","")
        cond = any(tok in p for tok in ["<PHONE>","<EMAIL>","<RRN>","<ADDRESS>"])
        sr.ok("CloseAI 노이즈 마스킹") if (sc==200 and cond) else sr.ng("CloseAI 노이즈 마스킹")
        if STRICT_PII and _has_pii_tokens(a):
            sr.ng("STRICT_PII: CloseAI 답변 내 PII 잔존")
    except Exception as e:
        sr.ng(f"CloseAI 노이즈 파싱 오류: {e}")

    return sr.dump()


# -------------------- 엔트리 --------------------
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--suite", choices=["standard","closeai","all"], default="standard",
                        help="실행할 테스트 묶음 선택")
    parser.add_argument("--fail-on-error", action="store_true", help="테스트 실패 시 비정상 종료 코드 반환")
    args = parser.parse_args()

    ok = True
    if args.suite in ("standard","all"):
        ok = run_suite_standard() and ok
    if args.suite in ("closeai","all"):
        ok = run_suite_closeai() and ok

    if args.fail_on_error and not ok:
        sys.exit(1)
    print("\n[INFO] 테스트 완료.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
