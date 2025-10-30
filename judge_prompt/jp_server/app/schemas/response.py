# app/schemas/response.py
from pydantic import BaseModel, Field

class JudgeModelOutput(BaseModel):
    summary: str
    clarityScore: float = Field(..., description="명확성 점수")
    specificityScore: float = Field(..., description="구체성 점수")
    formatScore: float = Field(..., description="형식 준수 점수")
    safetyScore: float = Field(..., description="안전성 점수")
    overallScore: float = Field(..., description="종합 점수")
