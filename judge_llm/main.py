# app.py — 명세 반영: 수동 AI 모델 학습 트리거
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, Header, BackgroundTasks

from app.wiring import build_pipeline  # 현재는 더미 구현체로 조립

app = FastAPI(title="메인 LLM 훈련 트리거")

# Bearer 토큰 검사 (명세: Authorization: Bearer accessToken)
AUTH_ENV = "AUTH_BEARER_TOKEN"  # .env에 설정하면 검사, 없으면 검사 생략

def _require_bearer(authorization: Optional[str]) -> None:
    expected = os.getenv(AUTH_ENV)
    if not expected:
        return  # 검사 비활성화(개발/로컬)
    if not authorization or not authorization.startswith("Bearer "):
        raise_value_error()
    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise_value_error()

def raise_value_error():
    # 명세는 실패를 200 + {"status":"FAIL"}로 응답
    # FastAPI 예외를 쓰지 않고 호출부에서 FAIL 응답을 내려주기 위해 예외로 신호만 던짐
    raise ValueError("UNAUTHORIZED")

@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "메인 LLM 훈련 로직 서버 동작중",
        "auth": "bearer" if os.getenv(AUTH_ENV) else "disabled",
    }

async def _run_training_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    실제 수동 학습 파이프라인 실행.
    - 현재는 더미 DI (Mongo/Judge/Mask/Repo)로 동작
    - 이후 실제 구현체로 wiring 교체
    """
    pipeline = build_pipeline(seed_data=[
        # 운영에서는 빈 리스트 유지. 필요시 로컬 스모크 데이터만 일시 사용.
        # {"pair_id":"p1","prompt":"hello 010-1234-5678","answer":"world","score":70},
    ])
    return await pipeline.run(payload or {})

@app.post("/api/v1/ai/training", status_code=202)
async def manual_training(
    background: BackgroundTasks,
    body: Dict[str, Any] | None = None,
    Authorization: Optional[str] = Header(default=None)
):
    """
    [수동 AI 모델 학습]
    - 명세서: POST /api/v1/ai/training
    - Header: Authorization: Bearer <accessToken>
    - Body: {} (입력 없음, 확장 가능)
    - 성공: 202 + {"status":"SUCCESS","data":{"jobId","message","timestamp"}}
    - 실패: 200 + {"status":"FAIL","data":{"message"}}
    """
    try:
        _require_bearer(Authorization)
    except ValueError:
        return {
            "status": "FAIL",
            "data": {"message": "학습에 실패하였습니다."}
        }

    job_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # 비동기 백그라운드로 파이프라인 실행
    background.add_task(_run_training_job, body or {})

    return {
        "status": "SUCCESS",
        "data": {
            "jobId": job_id,
            "message": "모델 학습 작업이 성공적으로 시작되었습니다.",
            "timestamp": timestamp
        }
    }
