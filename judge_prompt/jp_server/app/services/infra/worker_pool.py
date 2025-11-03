#jp_server/services/infra/worker_pool.py
from __future__ import annotations

import asyncio
from typing import Any, Dict, Tuple

import anyio
from loguru import logger

from app.services.judge.tokenizer_config import extract_features
from app.services.judge.llama_client import request_judge_output
from app.services.judge.judge_service import run_judge_model
from app.core.config import settings

QUEUE_MAXSIZE: int = getattr(settings, "QUEUE_MAXSIZE")

QueueItem = Tuple[str, "asyncio.Future[Dict[str, Any]]"]

request_q: asyncio.Queue[QueueItem] | None = None
_worker_tasks: list[asyncio.Task] = []


# 워커 본체
async def worker(name: str):
    """
    큐에서 (user_input, fut)을 꺼내:
      1) judge_service.run_judge_model(user_input, "")
      2) 결과(dict) 를 Future에 set_result
    """
    global request_q
    assert request_q is not None, "request_q not initialized. call start_workers() first."

    logger.info(f"[worker:{name}] started")

    while True:
        userInput, fut = await request_q.get()
        try:
            
            # judge_service가 내부에서 extract_features/llama_client/파싱까지 수행
            model_out = await run_judge_model(
                user_input=userInput
            )
            # model_out은 pydantic BaseModel(JudgeModelOutput)이므로 dict로 변환
            result: Dict[str, Any] = model_out.model_dump()

            if not fut.done():
                fut.set_result(result)

        except Exception as e:
            logger.exception(f"[worker:{name}] task failed: {e}")
            if not fut.done():
                fut.set_exception(e)
        finally:
            request_q.task_done()

async def start_workers(num_workers, qmax):
    """
    app startup에서 호출
        - num_workers: 워커 코루틴 수
        - qmax: 큐 최대 크기(None이면 settings.QUEUE_MAXSIZE)
    """
    global request_q, _worker_tasks

    if qmax is None:
        qmax = QUEUE_MAXSIZE

    if request_q is None:
        request_q = asyncio.Queue(maxsize=qmax)
    
    if _worker_tasks:
        logger.warning("workers already running; skip duplicate start")
        return

    for i in range(num_workers):
        t = asyncio.create_task(worker(f"w{i}"))
        _worker_tasks.append(t)

    logger.info(f"worker pool started: workers={num_workers}, queue_maxsize={qmax}")

def get_queue() -> asyncio.Queue[QueueItem]:
    """라우터에서 put_nowait로 사용할 큐 핸들"""
    assert request_q is not None, "request_q is not initialized; call start_workers() first"
    return request_q