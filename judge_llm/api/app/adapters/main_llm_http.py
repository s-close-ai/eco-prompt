from __future__ import annotations
import os
from typing import Dict, Any, List, Optional
import asyncio
import httpx

def _join_url(base: str, path: str) -> str:
    base = (base or "").rstrip("/")
    path = (path or "").lstrip("/")
    return f"{base}/{path}"

class HttpMainLlmClient:
    """
    메인 LLM HTTP 어댑터
    - 환경변수:
        MAIN_LLM_URL, MAIN_LLM_TRAIN_PATH, MAIN_LLM_TOKEN,
        MAIN_LLM_TIMEOUT_S, MAIN_LLM_RETRIES
    - train(batch_id, items): 마스킹된 항목을 메인 LLM으로 전달
    """
    def __init__(self) -> None:
        self.base_url = os.getenv("MAIN_LLM_URL", "").strip()
        self.train_path = os.getenv("MAIN_LLM_TRAIN_PATH", "/api/v1/ai/train").strip()
        self.token = os.getenv("MAIN_LLM_TOKEN", "").strip()
        self.timeout_s = float(os.getenv("MAIN_LLM_TIMEOUT_S", "30"))
        self.retries = int(os.getenv("MAIN_LLM_RETRIES", "2"))

        if not self.base_url:
            raise RuntimeError("MAIN_LLM_URL is not set")

        self.train_url = _join_url(self.base_url, self.train_path)

    def _headers(self) -> Dict[str, str]:
        h = {"Content-Type": "application/json", "accept": "application/json"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        return h

    async def train(self, batch_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        payload:
        {
          "batch_id": "...",
          "items": [
            {
              "message_id": "...",
              "prompt": "<MASKED>",
              "llm_response": "<MASKED or ''>",
              "rejected_response": "<MASKED or ''>"
            }, ...
          ]
        }
        """
        payload = {"batch_id": batch_id, "items": items}

        last_exc: Optional[Exception] = None
        for attempt in range(1, self.retries + 2):  # 초기 1회 + 재시도 N회
            try:
                async with httpx.AsyncClient(timeout=self.timeout_s) as client:
                    r = await client.post(self.train_url, json=payload, headers=self._headers())
                    r.raise_for_status()
                    try:
                        data = r.json()
                    except Exception:
                        data = {"text": r.text}
                    return {
                        "ok": True,
                        "received": len(items),
                        "batch_id": batch_id,
                        "response_status": r.status_code,
                        "response": data,
                        "train_url": self.train_url,
                    }
            except Exception as e:
                last_exc = e
                # 간단한 선형 backoff (1s, 2s, 3s ...)
                if attempt <= self.retries:
                    await asyncio.sleep(attempt)
                else:
                    break

        return {
            "ok": False,
            "received": len(items),
            "batch_id": batch_id,
            "error": f"MAIN_LLM_HTTP_ERROR: {type(last_exc).__name__}: {last_exc}",
            "train_url": self.train_url,
        }
