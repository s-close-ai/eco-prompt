# main.py
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, Header, BackgroundTasks
from app.wiring import build_pipeline  # 현재는 더미 구현체로 조립

APP_TITLE = "Judge LLM 수동 학습 트리거"
AUTH_ENV = "AUTH_BEARER_TOKEN"  # .env에 설정되면 Bearer 토큰 검증, 없으면 검증 생략

app = FastAPI(title=APP_TITLE)


def _require_bearer(authorization: Optional[str]) -> None:
    """Authorization: Bearer <token>. 유효하지 않으면 ValueError."""
    expected = os.getenv(AUTH_ENV)
    if not expected:
        return  # 검사 비활성화(개발/로컬)
    if not authorization or not authorization.startswith("Bearer "):
        raise ValueError("UNAUTHORIZED")
    token = authorization.split(" ", 1)[1].strip()
    if token != expected:
        raise ValueError("UNAUTHORIZED")


@app.get("/health")
async def health():
    return {
        "ok": True,
        "service": APP_TITLE,
        "auth": "bearer" if os.getenv(AUTH_ENV) else "disabled",
    }


async def _run_training_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    """수동 학습 파이프라인 실행 (현재 더미 DI, 추후 실제 구현체 연결)."""
    pipeline = build_pipeline(seed_data=[])
    return await pipeline.run(payload or {})


@app.post("/api/v1/ai/training", status_code=202)
async def manual_training(
    background: BackgroundTasks,
    body: Dict[str, Any] | None = None,
    Authorization: Optional[str] = Header(default=None),
):
    """
    [수동 AI 모델 학습 트리거]
    - POST /api/v1/ai/training
    - Header: Authorization: Bearer <accessToken>
    - Body  : {"batchId": string, "items": [ ... ]}  ← items 필수 (Mongo fallback 없음)
    - 성공(수락): 202 + {"status":"SUCCESS","data":{"jobId","message","timestamp"}}
    - 실패     : 200 + {"status":"FAIL","data":{"message"}}
    """
    # 1) 권한 검증
    try:
        _require_bearer(Authorization)
    except ValueError:
        return {"status": "FAIL", "data": {"message": "학습에 실패하였습니다."}}

    # 2) 요청 바디/필수 파라미터 확인
    payload = body or {}
    items = list(payload.get("items") or [])
    if not items:
        return {"status": "FAIL", "data": {"message": "payload.items가 필요합니다."}}

    # 3) 작업 수락(비동기 실행)
    job_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    payload.setdefault("batchId", f"manual-{job_id[:8]}")

    background.add_task(_run_training_job, payload)

    return {
        "status": "SUCCESS",
        "data": {
            "jobId": job_id,
            "message": "모델 학습 작업이 성공적으로 시작되었습니다.",
            "timestamp": timestamp,
        },
    }
