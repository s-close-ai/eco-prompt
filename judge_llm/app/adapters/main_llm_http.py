# app/adapters/main_llm_http.py
from __future__ import annotations
from typing import Dict, Any, List, Optional
import os, httpx

class HttpMainLlmClient:
    """
    Main LLM 훈련 API 호출 어댑터(실연결).
    .env
      MAIN_LLM_URL           # 예: http://backend-team:9090
      MAIN_LLM_TRAIN_PATH    # 기본 /api/v1/ai/training
      MAIN_LLM_TOKEN         # Bearer 토큰(옵션)
      MAIN_LLM_TIMEOUT_S     # 기본 30
      MAIN_LLM_RETRIES       # 기본 2
    요청 바디: {"items": [...]}  # 백엔드가 처음 준 형식과 동일
    """

    def __init__(self) -> None:
        base = os.getenv("MAIN_LLM_URL", "").rstrip("/")
        path = os.getenv("MAIN_LLM_TRAIN_PATH", "/api/v1/ai/training")
        if not base:
            raise RuntimeError("MAIN_LLM_URL is not set")
        self.url = f"{base}{path}"
        self.token = os.getenv("MAIN_LLM_TOKEN", "").strip()
        self.timeout_s = int(os.getenv("MAIN_LLM_TIMEOUT_S", "30"))
        self.retries = int(os.getenv("MAIN_LLM_RETRIES", "2"))

    async def train(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        payload = {"items": items}

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
                    if not ok and resp.status_code >= 500:
                        attempt += 1
                        continue
                    return {"ok": ok, "status_code": resp.status_code, "body": body}
                except Exception as e:
                    last_err = e
                    attempt += 1
        return {"ok": False, "status_code": 0, "body": {"error": f"request_failed: {last_err}"}}
