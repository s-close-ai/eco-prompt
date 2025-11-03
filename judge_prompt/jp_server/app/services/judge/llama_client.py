# app/services/judge/llama_client.py
import httpx, asyncio
from loguru import logger
from app.core.config import settings

LLAMA_URL=f"{settings.LLAMA_URL}/v1/judge"
MODEL_NAME=settings.MODEL_NAME

CONNECT_TIMEOUT = settings.CONNECT_TIMEOUT
READ_TIMEOUT = settings.READ_TIMEOUT
WRITE_TIMEOUT = settings.WRITE_TIMEOUT
POOL_TIMEOUT = settings.POOL_TIMEOUT

RETRIES = settings.RETRIES
CONCURRENCY_LIMIT = settings.CONCURRENCY_LIMIT

_client: httpx.AsyncClient | None = None
_gate = asyncio.Semaphore(CONCURRENCY_LIMIT)

async def get_client():
    """httpx AsyncClient를 싱글톤으로 재사용"""

    global _client
    if _client is None:
        limits = httpx.Limits(
            max_keepalive_connections=100,  # 동시에 유지할 keep-alive 연결 수
            max_connections=100,            # 전체 커넥션 수 제한
        )
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=CONNECT_TIMEOUT, read=READ_TIMEOUT, write=WRITE_TIMEOUT, pool=POOL_TIMEOUT),
            limits=limits,
            http2=True,  # HTTP/2 연결 유지
        )
        logger.info("[llama_client] httpx.AsyncClient initialized")
    return _client

async def request_judge_output(prompt):
    payload = {
        "prompt": prompt,        
    }

    client = await get_client()
    attempt = 0

    async with _gate: # 동시 요청 가능 최대 수 제어
        while True:
            try:
                response = await client.post(LLAMA_URL, json=payload)
                response.raise_for_status()
                return response.json()
            except (httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError) as e:
                # 네트워크 에러 / 타임아웃일 경우 짧게 재시도
                if attempt < RETRIES:
                    attempt += 1
                    wait = 0.2 * attempt
                    logger.warning(f"[llama_client] Retry {attempt}/{RETRIES} after {wait:.1f}s: {e}")
                    await asyncio.sleep(wait)
                    continue
                logger.error(f"[llama_client] Request failed: {e}")
                raise
            except httpx.HTTPStatusError as e:
                # 429 / 503은 백프레셔 상황 → 잠깐 대기 후 재시도
                if e.response.status_code in (429, 503) and attempt < RETRIES:
                    attempt += 1
                    await asyncio.sleep(0.2 * attempt)
                    continue
                logger.error(f"[llama_client] HTTP {e.response.status_code}: {e.response.text[:200]}")
                raise
            except Exception as e:
                logger.exception(f"[llama_client] Unexpected error: {e}")
                raise