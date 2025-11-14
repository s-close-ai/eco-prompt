# model_server/app/api/router.py
# system prompt, userInput, grammar 받아와서
# 모델에 추론 
from loguru import logger
from app.schemas.response import InferenceResponse
from app.schemas.request import InferenceRequest
from app.services.judge_service import run_judge_model
from fastapi import APIRouter, HTTPException, Request, Response

router = APIRouter()

@router.post("/v1/judge", response_model=InferenceResponse,)
async def prompt_judge(payload: InferenceRequest, request: Request, response: Response):
    try:
        result = await run_judge_model(payload.prompt)
        logger.success("[router]inference success")
        return result
    except Exception as e:
        logger.exception(f"[router] judge inference failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))