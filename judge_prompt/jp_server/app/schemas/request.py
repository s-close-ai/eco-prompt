# app/schemas/request.py
from pydantic import BaseModel, Field

class PromptJudgeRequest(BaseModel):
    userInput: str = Field(..., description="사용자 질의")
    messageUUID: str = Field(..., description="message UUID")