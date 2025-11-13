# 세마포어를 이용한 동시 요청 수 제한
import asyncio
from typing import Optional
from contextlib import asynccontextmanager

from app.core.config import base_settings

class ConcurrencyLimiter:
    """동시 요청 수를 제한하는 클래스"""

    def __init__(self, max_concurrent: int = 5):
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.max_concurrent = max_concurrent
        self.active_count = 0
        self.total_count = 0
        self._lock = asyncio.Lock()

    @asynccontextmanager
    async def limit(self):
        """컨텍스트 매니저로 사용"""
        async with self.semaphore:
            async with self._lock:
                self.active_count += 1
                self.total_count += 1
                current = self.active_count

            print(f"🟢 요청 시작 (활성: {current}/{self.max_concurrent})")

            try:
                yield
            finally:
                async with self._lock:
                    self.active_count -= 1
                    current = self.active_count
                print(f"🔴 요청 완료 (활성: {current}/{self.max_concurrent})")
    
    def get_stats(self):
        return {
            "active": self.active_count,
            "total": self.total_count,
            "max_concurrent": self.max_concurrent
        }
    
# 전역 인스턴스
LIMITER: Optional[ConcurrencyLimiter] = None

def get_limiter() -> ConcurrencyLimiter:
    global LIMITER

    if LIMITER is None:
        max_concurrent = base_settings.max_concurrent_requests
        LIMITER = ConcurrencyLimiter(max_concurrent=max_concurrent)
        print(f"✨ ConcurrencyLimiter 초기화 (max_concurrent={max_concurrent})")
        
    return LIMITER