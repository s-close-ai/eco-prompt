from __future__ import annotations
import os
import asyncio
import datetime
from typing import Dict, Any, Optional

from fastapi import FastAPI, Body, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# .env 파일 로드
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

class TrainPayload(BaseModel):
    batchId: Optional[str] = None
    items: list[dict]

# 서버 시작 시 실행
@app.on_event("startup")
async def on_startup() -> None:
    app.state.pipe = build_pipeline()

    # MongoDB 연결 확인
    try:
        from api.app.adapters.db.mongo_connector import ping as mongo_ping
        mongo_ping()
    except Exception as e:
        print(f"MongoDB 연결 실패: {e}")

    # Judge LLM 연결 확인
    try:
        _ = await app.state.pipe.judge.evaluate("ping", "pong")
        print("Judge 서버 연결 확인 완료")
    except Exception as e:
        print(f"Judge 서버 연결 실패: {e}")

    print("서버 시작 완료")

# 서버 종료 시 실행
@app.on_event("shutdown")
async def on_shutdown() -> None:
    print("서버 종료 중...")
    try:
        # 필요 시 자원 정리 코드 추가
        pass
    except Exception as e:
        print(f"종료 중 오류 발생: {e}")
    finally:
        print("서버 종료 완료")

# 헬스체크
@app.get("/health")
async def health():
    auth = "활성화" if os.getenv("API_BEARER_TOKEN") else "비활성화"
    return {
        "ok": True,
        "서비스": "메인 LLM 훈련 서버 동작 중",
        "인증": auth,
        "시간": datetime.datetime.utcnow().isoformat() + "Z",
    }

# 학습 요청 처리
@app.post("/api/v1/ai/training")
async def post_training(
    payload: TrainPayload = Body(...),
    sync: int | None = Query(default=None, description="1이면 동기 처리"),
):
    pipe = getattr(app.state, "pipe", None)
    if pipe is None:
        print("파이프라인 미초기화 → 재구성")
        app.state.pipe = build_pipeline()
        pipe = app.state.pipe

    if sync == 1:
        try:
            data: Dict[str, Any] = await pipe.run(payload.model_dump())
            print("동기 학습 요청 처리 완료")
            return JSONResponse({"status": "OK", "data": data}, status_code=200)
        except Exception as e:
            print(f"동기 학습 처리 중 오류: {e}")
            return JSONResponse({"status": "ERROR", "error": str(e)}, status_code=500)
    else:
        async def _bg():
            try:
                await pipe.run(payload.model_dump())
                print("비동기 학습 요청 처리 완료")
            except Exception as e:
                print(f"비동기 학습 처리 중 오류: {e}")

        asyncio.create_task(_bg())
        return JSONResponse(
            {
                "status": "SUCCESS",
                "data": {
                    "jobId": os.urandom(12).hex(),
                    "message": "학습 작업이 시작되었습니다.",
                    "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
                },
            },
            status_code=202,
        )

# 직접 실행 시
if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8081"))
    print(f"JudgeLLM 서버 실행 중: {host}:{port}")
    uvicorn.run("main:app", host=host, port=port, reload=False)
