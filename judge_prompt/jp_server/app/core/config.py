# app/core/config.py
from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    MODEL_PATH: str = Field(..., description="judge-prompt모델의 경로")
    LLAMA_URL: str = Field(..., description="llama server 실행 경로")
    MODEL_NAME: str = Field(..., description="model name")
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()

settings.MODEL_PATH = os.path.expanduser(settings.MODEL_PATH)