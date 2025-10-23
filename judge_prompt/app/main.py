import nltk
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # nltk stopwords 다운로드
        nltk.data.find("corpora/stopwords")
    except LookupError:
        nltk.download("stopwords")
    yield