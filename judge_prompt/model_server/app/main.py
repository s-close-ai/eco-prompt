from fastapi import FastAPI
from contextlib import asynccontextmanager
from loguru import logger

# lifespan -> 서버 실행 시 모델 빌드
from app.services.model_loader import warmup_model
from app.api.router import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 시작 시 모델 로드, 웜업
    try:
        logger.info("[lifespan] warming up model")
        await warmup_model()
        logger.success("[lifespan] warm-up-completed")
    except Exception as e:
        logger.warning(f"[lifespan] warm-up err: {e}")
    yield

app = FastAPI(
    title="Model Server",
    lifespan=lifespan
)

app.include_router(router)

@app.get("/healthz")
def healthz():
    return {"status": "ok"}