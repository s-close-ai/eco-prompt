# app/api/inference.py
# 사용자 입력 채팅, 질의 수신

# POST /prompt-judge 요청이 들어오면
from __future__ import annotations

import asyncio
from fastapi import APIRouter, HTTPException
from app.schemas.request import PromptJudgeRequest
from app.schemas.response import JudgeModelOutput
from app.services.infra.worker_pool import get_queue
router = APIRouter()

END_TO_END_TIMEOUT = 40.0
@router.post("/prompt-judge", response_model=JudgeModelOutput,)
async def prompt_judge(payload: PromptJudgeRequest):
    fut: "asyncio.Future[dict]" = asyncio.get_running_loop().create_future()
    try:
        get_queue().put_nowait((payload.userInput, fut))
    except asyncio.QueueFull:
        raise HTTPException(status_code=429, detail="Too many requests, please retry")
    
    try:
        result = await asyncio.wait_for(fut, timeout=END_TO_END_TIMEOUT)
        # 사용자 질의 평가에서는 사용자 지침을 사용하지 않을 것
        return result
    except asyncio.TimeoutError:
        # 상류(백엔드)에서 재시도/백오프할 수 있게 504
        raise HTTPException(status_code=504, detail="Upstream timeout")
    except ValueError as e:
        # 비즈니스 검증/파싱 오류는 400
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # 기타 예외는 500
        raise HTTPException(status_code=500, detail=f"Judge model error: {e.__class__.__name__}: {e}")