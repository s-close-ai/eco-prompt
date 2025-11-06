# model_server/app/schemas/response.py
from pydantic import BaseModel, Field

class ScoreInfo(BaseModel):
    clarityScore: float
    # clarityReason: str
    specificityScore: float
    # specificityReason: str
    formatScore: float
    # formatReason: str
    safetyScore: float
    # safetyReason: str

class InferenceResponse(BaseModel):
    summary: str
    scoreInfo: ScoreInfo