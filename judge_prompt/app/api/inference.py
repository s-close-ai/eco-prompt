# app/api/inference.py
# 사용자 입력 채팅, 질의 수신

# POST /prompt-judge 요청이 들어오면
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import JSONResponse
from app.schemas.request import PromptJudgeRequest
from app.schemas.response import JudgeModelOutput

router = APIRouter()

@router.post("/prompt-judge", response_model=JudgeModelOutput,)
async def prompt_judge(payload: PromptJudgeRequest):
    try:
        result = run_judge_model(payload.userInput, payload.userPersonalPrompt)
        # 사용자 질의 평가에서는 사용자 지침을 사용하지 않을 것
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Judge model error: {e}")