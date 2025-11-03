# judge_llm/api/api/app/adapters/main_llm_http.py
from __future__ import annotations
from typing import Dict, Any, List, Optional
import os, httpx, asyncio


class HttpMainLlmClient:
    """
    Main LLM 훈련 API 호출 어댑터(실연결).
    .env
      MAIN_LLM_URL
      MAIN_LLM_TRAIN_PATH   (default: /api/v1/ai/train)
      MAIN_LLM_TOKEN
      MAIN_LLM_TIMEOUT_S    (default: 30)
      MAIN_LLM_RETRIES      (default: 2)
    요청 바디: {"batch_id": str, "items": [...]}  # 백엔드가 처음 준 형식과 동일(원본 키 유지, 값만 마스킹)
    """
    def __init__(self) -> None:
        base = os.getenv("MAIN_LLM_URL", "").rstrip("/")
        path = os.getenv("MAIN_LLM_TRAIN_PATH", "/api/v1/ai/train")
        if not base:
            raise RuntimeError("MAIN_LLM_URL is not set")
        self.url = f"{base}{path}"
        self.token = os.getenv("MAIN_LLM_TOKEN", "").strip()
        self.timeout_s = int(os.getenv("MAIN_LLM_TIMEOUT_S", "30"))
        self.retries = int(os.getenv("MAIN_LLM_RETRIES", "2"))

    async def train(self, batch_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"  # ← 여분 } 제거
        payload = {"batch_id": batch_id, "dataset": items}

        attempt = 0
        last_err: Optional[Exception] = None
        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            while attempt <= self.retries:
                try:
                    resp = await client.post(self.url, headers=headers, json=payload)
                    try:
                        body = resp.json()
                    except Exception:
                        body = resp.text
                    ok = 200 <= resp.status_code < 300
                    if not ok and (resp.status_code >= 500 or resp.status_code == 429):
                        attempt += 1
                        await asyncio.sleep(min(2 ** attempt, 5))
                        continue
                    return {"ok": ok, "status_code": resp.status_code, "body": body}
                except Exception as e:
                    last_err = e
                    attempt += 1
        return {"ok": False, "status_code": 0, "body": {"error": f"request_failed: {last_err}"}}
