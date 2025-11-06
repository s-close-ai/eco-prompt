# model_server/app/schemas/request.py
from pydantic import BaseModel, Field

class InferenceRequest(BaseModel):
    prompt: str = Field(..., description="사용자 프롬프트 / 평가 대상 텍스트")

   