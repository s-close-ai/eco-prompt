# app/schemas/request.py
from pydantic import BaseModel, Field

class PromptJudgeRequest(BaseModel):
    userInput: str = Field(..., description="사용자 질의")
    userPersonalPrompt: str = Field("", description="사용자 지침")