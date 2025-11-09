# judge_llm/main.py
from __future__ import annotations
import os
import asyncio
import datetime
from typing import Dict, Any, Optional, List, Union, Literal

from fastapi import FastAPI, Body, Query, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(__file__)
ENV_PATHS = [
    os.path.join(BASE_DIR, "api/.env"),
    os.path.join(BASE_DIR, ".env"),
]
for path in ENV_PATHS:
    if os.path.isfile(path):
        load_dotenv(path, override=True)
        print(f"[.env 로드]: {path}")
        break

from api.app.wiring import build_pipeline

app = FastAPI(title="JudgeLLM API", version="1.0")

# Pydantic Schemas (요청)
class CloseAIMessage(BaseModel):
    messageUUID: str
    sender_type: Literal["USER", "AI", "TRAIN"]
    content: str

class StandardItem(BaseModel):
    message_id: str = Field(default="")
    prompt: str = Field(default="")
    llm_response: str = Field(default="")
    rejected_response: str = Field(default="")

class TrainPayload(BaseModel):
    batchId: Optional[str] = None
    items: List[StandardItem]

# Pydantic Schemas (응답)
class Subscores(BaseModel):
    correctness: Optional[int] = None
    completeness: Optional[int] = None
    clarity: Optional[int] = None
    practices: Optional[int] = None

class ResultItem(BaseModel):
    message_id: Optional[str] = None
    total: Optional[int] = None
    final_score: Optional[float] = None
    passed: Optional[bool] = None
    subscores: Optional[Subscores] = None
    error: Optional[str] = None
    status: Optional[str] = None

class MainLLMAck(BaseModel):
    ok: Optional[bool] = None
    received: Optional[int] = None
    batch_id: Optional[str] = None
    response_status: Optional[int] = None
    response: Optional[dict] = None
    train_url: Optional[str] = None

class TrainingData(BaseModel):
    batch_id: str
    processed: int
    success_eval: int
    failed_eval: int
    upserted: int
    upsert_failed: int
    main_llm_triggered: bool
    main_llm_ack: Optional[MainLLMAck] = None
    main_llm_error: Optional[str] = None
    results: List[ResultItem]
    masked_preview: Optional[List[dict]] = None  # DEBUG_MASK_PREVIEW=true 일 때만 포함

class EnvelopeOK(BaseModel):
    status: Literal["OK"]
    data: TrainingData

class EnvelopeAccepted(BaseModel):
    status: Literal["SUCCESS"]
    data: dict  # { jobId, message, timestamp }

class EnvelopeError(BaseModel):
    status: Literal["ERROR"]
    error: str

# Lifecycle
@app.on_event("startup")
async def on_startup() -> None:
    app.state.pipe = build_pipeline()
    try:
        from api.app.adapters.db.mongo_connector import ping as mongo_ping
        mongo_ping()
    except Exception as e:
        print(f"MongoDB 연결 실패: {e}")
    try:
        _ = await app.state.pipe.judge.evaluate("ping", "pong")
        print("Judge 서버 연결 확인 완료")
    except Exception as e:
        print(f"Judge 서버 연결 실패: {e}")
    print("서버 시작 완료")

@app.on_event("shutdown")
async def on_shutdown() -> None:
    print("서버 종료 중...")
    print("서버 종료 완료")

# =========================
# Health
# =========================
@app.get("/health")
async def health():
    auth = "활성화" if os.getenv("API_BEARER_TOKEN") else "비활성화"
    return {
        "ok": True,
        "서비스": "JudgeLLM 훈련 파이프라인 동작 중",
        "인증": auth,
        "시간": datetime.datetime.utcnow().isoformat() + "Z",
    }

# Training Endpoint
@app.post(
    "/api/v1/ai/training",
    response_model=EnvelopeOK | EnvelopeAccepted | EnvelopeError,
    summary="Training",
    description="CloseAI 배열 또는 표준 배치 페이로드를 받아 평가/마스킹 후 메인 LLM 트리거"
)
async def post_training(
    payload: Union[List[CloseAIMessage], TrainPayload] = Body(..., description="CloseAI 배열 또는 표준 배치"),
    sync: Optional[int] = Query(default=None, description="1이면 동기 처리"),
    request: Request = None,
):
    pipe = getattr(app.state, "pipe", None) or build_pipeline()
    app.state.pipe = pipe

    # Pydantic 모델을 dict로 정규화
    if isinstance(payload, list):
        body = [m.model_dump() for m in payload]
    elif isinstance(payload, TrainPayload):
        body = payload.model_dump()
    else:
        raise HTTPException(status_code=422, detail="Invalid payload type")

    async def _do_run() -> Dict[str, Any]:
        if isinstance(body, list):
            return await pipe.run(body)
        if isinstance(body, dict):
            return await pipe.run(body)
        raise ValueError("Invalid payload type")

    if sync == 1:
        try:
            data = await _do_run()
            return JSONResponse(status_code=200, content={"status": "OK", "data": data})
        except Exception as e:
            return JSONResponse(status_code=500, content={"status": "ERROR", "error": str(e)})
    else:
        async def _bg():
            try:
                await _do_run()
                print("비동기 학습 요청 처리 완료")
            except Exception as e:
                print(f"비동기 학습 처리 중 오류: {e}")

        asyncio.create_task(_bg())
        return JSONResponse(
            status_code=202,
            content={
                "status": "SUCCESS",
                "data": {
                    "jobId": os.urandom(12).hex(),
                    "message": "학습 작업이 시작되었습니다.",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                },
            },
        )

# Entrypoint
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8081"))
    print(f"JudgeLLM 서버 실행 중: {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=False)
