# main.py — 명세 반영: 수동 AI 모델 학습 트리거
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from fastapi import FastAPI, Header, BackgroundTasks
from app.wiring import build_pipeline  # 현재는 더미 구현체로 조립

app = FastAPI(title="메인 LLM 훈련 트리거")

AUTH_ENV = "AUTH_BEARER_TOKEN"  # .env 값과 비교

def _require_bearer(authorization: Optional[str]) -> None:
    expected = os.getenv(AUTH_ENV)
    if not expected:
        return  # 토큰 검증 비활성 (로컬용)
    if not authorization or not authorization.startswith("Bearer "):
        raise ValueError("UNAUTHORIZED")
    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise ValueError("UNAUTHORIZED")

@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": "메인 LLM 훈련 로직 서버 동작중",
        "auth": "bearer" if os.getenv(AUTH_ENV) else "disabled",
    }

async def _run_training_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    pipeline = build_pipeline(seed_data=[])
    return await pipeline.run(payload or {})

@app.post("/api/v1/ai/training", status_code=202)
async def manual_training(
    background: BackgroundTasks,
    body: Dict[str, Any] | None = None,
    Authorization: Optional[str] = Header(default=None)
):
    """
    [수동 AI 모델 학습]
    - Header: Authorization: Bearer <accessToken>
    - Body: { "batchId": str, "items": [ {pair_id, prompt, answerUser, answerTrain} ] }
    - 성공: 202 + {"status":"SUCCESS", "data":{...}}
    - 실패: 200 + {"status":"FAIL", "data":{"message"}}
    """
    try:
        _require_bearer(Authorization)
    except ValueError:
        return {"status": "FAIL", "data": {"message": "학습에 실패하였습니다.(UNAUTHORIZED)"}}

    items = list((body or {}).get("items") or [])
    if not items:
        return {"status": "FAIL", "data": {"message": "학습에 실패하였습니다.(NO_ITEMS)"}}

    job_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    background.add_task(_run_training_job, body or {})
    return {
        "status": "SUCCESS",
        "data": {
            "jobId": job_id,
            "message": "모델 학습 작업이 성공적으로 시작되었습니다.",
            "timestamp": timestamp
        }
    }
