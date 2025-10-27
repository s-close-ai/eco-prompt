# app/services/judge/model_loader.py
from llama_cpp import Llama
from loguru import logger
import asyncio
from app.core.config import settings

_model_instance: Llama | None = None
_model_lock = asyncio.Lock()

async def get_llama_model():
    # lazy-load 방식으로 모델 가져오기
    global _model_instance

    # 이미 로드 되어있다면 캐시된 인스턴스 반환
    if _model_instance is not None:
        return _model_instance

    async with _model_lock:
        if _model_instance is None:
            logger.info("Judge Prompt 모델 로딩 중... ")
            _model_instance = Llama(
                model_path = settings.MODEL_PATH,
                n_ctx=8192,
                n_gpu_layers=-1,
                n_threads=8,
                verbose=False,
            )
            logger.success("모델을 성공적으로 로드하였습니다.")
        else:
            logger.debug("모델이 이미 로드되어 있습니다.")
    return _model_instance

async def warmup_model():
    # 백그라운드에서 모델을 미리 로드
    try:
        logger.info("Judge prompt 백그라운드에서 미리 로드")
        await get_llama_model()
        logger.success("warm-up 완료")
    except Exception as e:
        logger.error(f"warm-up failed: {e}")