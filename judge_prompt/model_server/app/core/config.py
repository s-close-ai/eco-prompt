# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    MODEL_PATH: str = Field(..., description="judge-prompt모델의 경로")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
settings.MODEL_PATH = os.path.expanduser(settings.MODEL_PATH)