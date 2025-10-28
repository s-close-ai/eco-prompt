# app/adapters/judge_llama_http.py
from __future__ import annotations
from typing import Dict, Any, Optional
import os, re, json, httpx

def _extract_json_block(text: str) -> Dict[str, Any]:
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S | re.I)
    if m:
        return json.loads(m.group(1))
    # naive brace match
    start = text.find("{")
    if start < 0:
        raise ValueError("no JSON object in model output")
    depth, buf = 0, []
    for ch in text[start:]:
        buf.append(ch)
        if ch == "{": depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0: break
    return json.loads("".join(buf))

def _to_total(fs: int, subs: Optional[Dict[str,int]]) -> int:
    if isinstance(subs, dict):
        c = {k:int(max(0,min(100,float(subs.get(k,0))))) for k in ["correctness","completeness","clarity","practices"]}
        if len(c)==4:
            # 기본 가중치(45/25/15/15)
            return (45*c["correctness"] + 25*c["completeness"] + 15*c["clarity"] + 15*c["practices"]) // 100
    return int(round((int(fs)/5)*100))

class HttpJudgeClient:
    """
    llama-server(OpenAI 호환)로 Prometheus2 평가 프롬프트 전송.
    .env
      LLAMA_SERVER_URL      (예: http://127.0.0.1:8080)
      LLAMA_SERVER_MODEL    (예: prometheus2-7b-q5 or 임의 문자열)
      JUDGE_MAX_TOKENS=192
      JUDGE_TEMPERATURE=0
      JUDGE_TIMEOUT_S=40
    반환: {"score": int(0..100), "feedback": str, "raw": dict}
    """
    def __init__(self) -> None:
        base = os.getenv("LLAMA_SERVER_URL", "http://127.0.0.1:8080").rstrip("/")
        self.url = f"{base}/v1/chat/completions"
        self.model = os.getenv("LLAMA_SERVER_MODEL", "prom2")
        self.max_tokens = int(os.getenv("JUDGE_MAX_TOKENS", "192"))
        self.temperature = float(os.getenv("JUDGE_TEMPERATURE", "0"))
        self.timeout_s = int(os.getenv("JUDGE_TIMEOUT_S", "40"))

        # 시스템 프롬프트(간결)
        limit = int(os.getenv("JUDGE_TEXT_LIMIT", "220"))
        self.sys = (
            'You are Prometheus 2 for coding tasks. '
            'Return ONLY a JSON: {"criteria":"string","final_score":1-5,'
            '"feedback":"string","subscores":{"correctness":0-100,"completeness":0-100,'
            '"clarity":0-100,"practices":0-100}}. '
            f'Each string must be concise (<= {limit} chars). No extra text.'
        )

    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        user = (
            "Evaluate the following Q/A pair for correctness, completeness, clarity, and best practices.\n\n"
            f"Q:\n{prompt}\n\nA:\n{answer}\n\n"
            "Output ONLY the JSON."
        )

        req = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.sys},
                {"role": "user", "content": user},
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }

        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            resp = await client.post(self.url, json=req)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        j = _extract_json_block(content)

        fs = j.get("final_score")
        try:
            fs = int(fs)
        except Exception:
            raise ValueError(f"invalid final_score: {fs}")

        subs = j.get("subscores") if isinstance(j.get("subscores"), dict) else None
        total = _to_total(fs, subs)
        fb = str(j.get("feedback") or "").strip()

        return {"score": total, "feedback": fb, "raw": j}
