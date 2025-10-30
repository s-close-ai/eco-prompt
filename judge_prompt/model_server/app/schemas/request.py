# model_server/app/schemas/request.py
from pydantic import BaseModel, Field

class InferenceRequest(BaseModel):
    systemprompt:str = Field(
        ..., description="시스템 프롬프트"
    )
    prompt: str = Field(..., description="사용자 프롬프트 / 평가 대상 텍스트")

   