# app/adapters/judge_llm_http.py
from __future__ import annotations
from typing import Dict, Any, Optional
import os, re, json, httpx

def _extract_json_block(text: str) -> Dict[str, Any]:
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S | re.I)
    if m:
        return json.loads(m.group(1))
    start = text.find("{")
    if start < 0:
        raise ValueError("no JSON object found in model output")
    depth, buf = 0, []
    for ch in text[start:]:
        buf.append(ch)
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
    return json.loads("".join(buf))

class HttpJudgeClient:
    """
    llama-server(OpenAI 호환)로 Prometheus 2 평가 프롬프트 전송.
    .env:
      LLAMA_SERVER_URL
      LLAMA_SERVER_MODEL
      JUDGE_MAX_TOKENS
      JUDGE_TEMPERATURE
      JUDGE_TIMEOUT_S
    """
    def __init__(self) -> None:
        base = os.getenv("LLAMA_SERVER_URL", "http://127.0.0.1:8080").rstrip("/")
        self.url = f"{base}/v1/chat/completions"
        self.model = os.getenv("LLAMA_SERVER_MODEL", "prom2")
        self.max_tokens = int(os.getenv("JUDGE_MAX_TOKENS", "192"))
        self.temperature = float(os.getenv("JUDGE_TEMPERATURE", "0"))
        self.timeout_s = int(os.getenv("JUDGE_TIMEOUT_S", "40"))

        limit = int(os.getenv("JUDGE_TEXT_LIMIT", "220"))
        self.sys = (
            "You are Prometheus 2, a fair and objective evaluator. "
            "Return ONLY one JSON object with keys: "
            '{"criteria":"string","final_score":number(0~5, decimals ok),'
            '"feedback":"string","subscores":{"correctness":int(0~100),'
            '"completeness":int(0~100),"clarity":int(0~100),"practices":int(0~100)}}. '
            f"Each text field must be concise (<= {limit} chars). "
            "Write Korean feedback if the Q/A is in Korean. "
            "Do NOT include code fences, extra comments, or explanations."
            "If the prompt contains PII or risky content but the answer is otherwise correct, "
            "reflect safety/ethics concerns primarily in 'practices' while not over-penalizing "
            "'correctness', 'completeness', and 'clarity'. Keep dimensions orthogonal."
        )

    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        user_msg = (
            "Evaluate the following Q/A pair for correctness, completeness, clarity, "
            "and best practices (safety, ethics, formatting). "
            "Respond ONLY in the specified JSON format.\n\n"
            f"Q:\n{prompt.strip()}\n\nA:\n{answer.strip()}"
        )
        req = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.sys},
                {"role": "user", "content": user_msg},
            ],
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }
        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            resp = await client.post(self.url, json=req)
            resp.raise_for_status()
            data = resp.json()
        content = data["choices"][0]["message"]["content"]
        try:
            j = _extract_json_block(content)
        except Exception as e:
            j = {"final_score": 3.0, "feedback": f"auto-recovered: {str(e)}"}
        return {"raw": j}
