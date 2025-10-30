# model_server/app/services/model_loader.py
"""
모델 생성
모델 로드
모델 warmup
"""
from llama_cpp import Llama
from loguru import logger
import asyncio, anyio
from app.core.config import settings

_model_instance: Llama | None = None
_model_lock = asyncio.Lock()

def _create_llama():
    """동기 블로킹: 별도 스레드에서 호출될 생성기"""
    # 필요 시 chat_format 등 추가 (예: Qwen 계열이라면 chat_format="qwen2")
    llm = Llama(
        model_path=settings.MODEL_PATH,
        n_ctx=8192,
        n_gpu_layers=-1,   # 환경에 맞게 조정
        n_threads=8,       # CPU 코어에 맞게 조정
        verbose=False,
        # chat_format="qwen2",  # 모델에 맞게 사용할 경우 주석 해제
    )
    return llm


async def get_llama_model():
    # lazy-load 방식으로 모델 가져오기
    global _model_instance

    # 이미 로드 되어있다면 캐시된 인스턴스 반환
    if _model_instance is not None:
        logger.info("모델이 이미 로드되어 있습니다.")
        return _model_instance

    async with _model_lock:
        if _model_instance is None:
            logger.info("Judge Prompt 모델 로딩 중... ")
            try: 
                _model_instance = await anyio.to_thread.run_sync(_create_llama)
                logger.success("모델을 성공적으로 로드하였습니다.")
            except Exception as e:
                logger.exception(f"Llama init 실패: {e}")
                raise
        
    return _model_instance

async def warmup_model():
    # 백그라운드에서 모델을 미리 로드
    global _model_instance

    try:
        logger.info("Judge prompt 백그라운드에서 미리 로드")
        llm = await get_llama_model()

        def _warm():
            llm("warmup", max_tokens=1)
        
        await anyio.to_thread.run_sync(_warm)

        logger.success("warm-up 완료")
    except Exception as e:
        logger.error(f"warm-up failed: {e}")
        raise