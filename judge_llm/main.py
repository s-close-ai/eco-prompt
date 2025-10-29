# main.py
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional

from fastapi import FastAPI, Header, BackgroundTasks, HTTPException, Query
from fastapi.responses import JSONResponse
from dotenv import load_dotenv; load_dotenv()

from app.wiring import build_pipeline  # 현재는 더미 구현체로 조립

app = FastAPI(title="메인 LLM 훈련 트리거")

# 양쪽 키를 모두 지원 (기존 코드/새 코드 호환)
AUTH_ENV_PRIMARY = "MAIN_LLM_TOKEN"
AUTH_ENV_FALLBACK = "AUTH_BEARER_TOKEN"

def _require_bearer(authorization: Optional[str]) -> None:
    expected = os.getenv(AUTH_ENV_PRIMARY) or os.getenv(AUTH_ENV_FALLBACK)
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
        "auth": "bearer" if (os.getenv(AUTH_ENV_PRIMARY) or os.getenv(AUTH_ENV_FALLBACK)) else "disabled",
    }

# 파이프라인은 프로세스당 1번만 조립해 재사용 (성능/리소스 안정)
PIPELINE = build_pipeline(seed_data=[])

async def _run_training_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    return await PIPELINE.run(payload or {})

@app.post("/api/v1/ai/training")
async def manual_training(
    background: BackgroundTasks,
    body: Dict[str, Any] | None = None,
    Authorization: Optional[str] = Header(default=None),
    sync: bool = Query(default=False, description="true/1 이면 동기로 즉시 결과 반환"),
):
    """
    [수동 AI 모델 학습]
    - Header: Authorization: Bearer <accessToken>
    - Body: { "batchId": str, "items": [ { ...원본 키... } ] }
    - 성공(비동기): 202 + {"status":"SUCCESS", "data":{...}}
    - 성공(동기)  : 200 + {"status":"OK",      "data":{...}}
    - 실패       : 200 + {"status":"FAIL",    "data":{"message"}}
    """
    try:
        _require_bearer(Authorization)
    except ValueError:
        return {"status": "FAIL", "data": {"message": "학습에 실패하였습니다.(UNAUTHORIZED)"}}

    items = list((body or {}).get("items") or [])
    if not items:
        return {"status": "FAIL", "data": {"message": "학습에 실패하였습니다.(NO_ITEMS)"}}

    if sync:
        try:
            result = await _run_training_job(body or {})
            return {"status": "OK", "data": result}  # 200 OK
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"sync_failed: {e}")

    # 비동기 경로 → 202
    job_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    background.add_task(_run_training_job, body or {})
    return JSONResponse(
        status_code=202,
        content={
            "status": "SUCCESS",
            "data": {
                "jobId": job_id,
                "message": "모델 학습 작업이 성공적으로 시작되었습니다.",
                "timestamp": timestamp,
            },
        },
    )
