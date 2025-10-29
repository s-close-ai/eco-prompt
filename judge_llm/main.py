# judge_llm/main.py
# python 3.12.3
from __future__ import annotations

import os
import asyncio
from typing import Dict, Any, Optional

from fastapi import FastAPI, Body, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# --- .env 로드: api/.env 우선, 그 다음 루트 .env (override=True) ---
BASE_DIR = os.path.dirname(__file__)
ENV_CANDIDATES = [os.path.join(BASE_DIR, "api/.env"),
                  os.path.join(BASE_DIR, ".env")]
for path in ENV_CANDIDATES:
    if os.path.isfile(path):
        load_dotenv(path, override=True)
        break

# 패키지 임포트: api/app/*
from api.app.wiring import build_pipeline  # noqa

app = FastAPI(title="JudgeLLM API", version="1.0")


class TrainPayload(BaseModel):
    batchId: Optional[str] = None
    items: list[dict]


# ---- 앱 시작/종료 훅: 파이프라인 싱글톤 준비 ----
@app.on_event("startup")
async def on_startup() -> None:
    # 필요시 seed_data 전달 가능
    app.state.pipe = build_pipeline()
    # 초기화 로그 강제 출력 유도용으로 더미 호출(원치 않으면 제거해도 됨)
    try:
        # judge 연결 확인용 매우 가벼운 프롬프트
        _ = await app.state.pipe.judge.evaluate("ping", "pong")
    except Exception:
        # judge 미연결이어도 API 자체는 살아있을 수 있으므로 무시
        pass


@app.on_event("shutdown")
async def on_shutdown() -> None:
    # 여기에 자원 정리 로직이 필요하면 추가
    pass


@app.get("/health")
async def health():
    auth = "enabled" if os.getenv("API_BEARER_TOKEN") else "disabled"
    return {"ok": True, "service": "메인 LLM 훈련 로직 서버 동작중", "auth": auth}


@app.post("/api/v1/ai/training")
async def post_training(
    payload: TrainPayload = Body(...),
    sync: int | None = Query(default=None, description="1이면 동기 처리"),
):
    pipe = getattr(app.state, "pipe", None)
    if pipe is None:
        # 이 경우는 거의 없음(스타트업 실패 케이스 방어)
        app.state.pipe = build_pipeline()
        pipe = app.state.pipe

    if sync == 1:
        try:
            data: Dict[str, Any] = await pipe.run(payload.model_dump())
            return JSONResponse({"status": "OK", "data": data}, status_code=200)
        except Exception as e:
            return JSONResponse({"status": "ERROR", "error": str(e)}, status_code=500)
    else:
        # 비동기 시뮬레이션: enqueue 대체
        async def _bg():
            try:
                await pipe.run(payload.model_dump())
            except Exception:
                pass

        asyncio.create_task(_bg())
        return JSONResponse(
            {
                "status": "SUCCESS",
                "data": {
                    "jobId": os.urandom(12).hex(),
                    "message": "모델 학습 작업이 성공적으로 시작되었습니다.",
                    "timestamp": os.popen("date -u +%Y-%m-%dT%H:%M:%SZ").read().strip(),
                },
            },
            status_code=202,
        )


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8081"))
    # 개발 중엔 reload=False 권장(싱글톤 초기화 중복 방지)
    uvicorn.run("main:app", host=host, port=port, reload=False)
