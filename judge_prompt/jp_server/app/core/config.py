# app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    MODEL_PATH: str = Field(..., description="judge-prompt모델의 경로")
    LLAMA_URL: str = Field(..., description="llama server 실행 경로")
    MODEL_NAME: str = Field(..., description="model name")
    QUEUE_MAXSIZE: int = Field(..., description="큐 max size")
    WORKERS: int = Field(..., description="workers(동시 요청 병렬 처리) 수")

    CONNECT_TIMEOUT: float = Field(..., description="connect timeout")
    READ_TIMEOUT: float = Field(..., description="read timeout")
    WRITE_TIMEOUT: float = Field(..., description="write timeout")
    POOL_TIMEOUT: float = Field(..., description="HTTP pool timeout (sec)")

    RETRIES: float = Field(..., description="retries")
    CONCURRENCY_LIMIT: float = Field(..., description="concurrency limit")
    SSAFY_CURRICULUM_WEEKLY_URL: str = Field(..., description="주간안내 url")
    SSAFY_COOKIE_JSESSIONID: str = Field(..., description="세션쿠키 id")
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

settings.MODEL_PATH = os.path.expanduser(settings.MODEL_PATH)