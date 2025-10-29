import nltk, httpx
from fastapi import FastAPI
from contextlib import asynccontextmanager
from loguru import logger
from app.api.inference import router
from app.core.config import settings

MODEL_READY_FLAG_KEY = "model_ready"
LLAMA_HEALTH_URL=f"{settings.LLAMA_URL}/models"

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # nltk stopwords 다운로드
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords")
    
    try: 
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(LLAMA_HEALTH_URL)
            if res.status_code == 200:
                setattr(app.state, MODEL_READY_FLAG_KEY, True)
                logger.success("✅ llama_cpp.server reachable & model ready")
            else:
                setattr(app.state, MODEL_READY_FLAG_KEY, False)
                logger.warning(f"⚠️ llama_cpp.server returned {res.status_code}")
    except Exception as e:
        setattr(app.state, MODEL_READY_FLAG_KEY, False)
        logger.error(f"❌ llama_cpp.server not reachable: {e}")

    try:
        yield
    finally:
        setattr(app.state, MODEL_READY_FLAG_KEY, False)
        logger.info("Shutting down...")

app = FastAPI(lifespan=lifespan)
@app.get("/health")
def health():
    return {
        "ok": True,
        "model_ready": getattr(app.state, MODEL_READY_FLAG_KEY, False)
    }

app.include_router(router)