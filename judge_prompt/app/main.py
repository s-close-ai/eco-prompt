import nltk
from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.api.inference import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # nltk stopwords 다운로드
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords")
    yield


app = FastAPI(lifespan=lifespan)
@app.get("/health")
def health():
    return {"ok": True}

app.include_router(router)