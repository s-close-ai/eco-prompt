# judge_llm/api/app/adapters/judge_llm_http.py
from __future__ import annotations
from typing import Dict, Any
import os, re, json, httpx

def _extract_json_block(text: str) -> Dict[str, Any]:
    # 먼저 순수 JSON만 있는 경우 빠르게 시도
    text_stripped = text.strip()
    if text_stripped.startswith("{") and text_stripped.endswith("}"):
        return json.loads(text_stripped)
    # 코드펜스 → 중괄호 스캔 기존 로직
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

def _normalize_keys(obj: dict) -> dict:
    clean = {}
    for k, v in obj.items():
        k2 = k.strip().lower().replace(" ", "")
        clean[k2] = _normalize_keys(v) if isinstance(v, dict) else v
    return clean

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
        self.text_limit = int(os.getenv("JUDGE_TEXT_LIMIT", "9999"))

        self.sys = (
        "You are Prometheus 2, a strict evaluator. "
        "Respond ONLY with a single valid JSON object (no code fences). "
        "Subscores are integers 0–100. 'total' is the mean of subscores (rounded). "
        "final_score = total/20 on 0–5 scale.\n"
        "JSON: {\"criteria\":\"string\",\"final_score\":number,\"total\":number,"
        "\"feedback\":\"string\",\"subscores\":{\"correctness\":int,\"completeness\":int,"
        "\"clarity\":int,\"practices\":int}}. "
        f"Keep text fields concise (<= {self.text_limit} chars). Write Korean feedback for Korean Q/A.\n"
        "SCORING ANCHORS:\n"
        "- 90–100: 정확/완전/매우 명료, 모범적 안전/윤리, 구조 우수, 실무적.\n"
        "- 80–89: 대부분 정확/완전, 약간의 보완 여지. 명확하며 구조 양호.\n"
        "- 70–79: 대체로 맞지만 일부 누락/모호. 구조 평이.\n"
        "- 60–69: 일부 부정확/누락이 눈에 띔. 명료성과 구조 부족.\n"
        "- 50: 근거 부족/짧거나 애매해 품질 판단이 어려움(최소 합격 미달 기준).\n"
        "- <50: 명백히 부정확/부적절/형식 위반.\n"
        "If the answer enumerates goals, explains structure with concrete details and remains coherent, "
        "avoid 50: use >=80 unless there are clear inaccuracies or meaningful gaps."
        )


        # 옵션: llama.cpp server가 지원하면 JSON 강제
        self.use_json_format = os.getenv("JUDGE_USE_JSON_FORMAT", "true").lower() == "true"

    async def _call(self, user_msg: str, max_tokens: int) -> str:
        req = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": self.sys},
                {"role": "user", "content": user_msg},
            ],
            "temperature": self.temperature,
            "max_tokens": max_tokens,
        }
        # OpenAI 호환 json_object 강제 (지원 시)
        if self.use_json_format:
            req["response_format"] = {"type": "json_object"}

        async with httpx.AsyncClient(timeout=self.timeout_s) as client:
            resp = await client.post(self.url, json=req)
            resp.raise_for_status()
            data = resp.json()
        return data["choices"][0]["message"]["content"]

    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        user_msg = (
            "Evaluate the following Q/A pair for correctness, completeness, clarity, and best practices. "
            "Respond ONLY with the JSON specified.\n\n"
            f"Q:\n{prompt.strip()}\n\nA:\n{answer.strip()}"
        )

        # 1차 시도
        content = await self._call(user_msg, self.max_tokens)
        try:
            j = _extract_json_block(content)
        except Exception as e1:
            # 2차 재시도: 토큰 2배/지시문 강화
            retry_msg = user_msg + "\n\nReturn ONLY the JSON object. No extra text."
            content2 = await self._call(retry_msg, int(self.max_tokens * 2))
            try:
                j = _extract_json_block(content2)
            except Exception as e2:
                # 마지막 방어: 최소 필드로 복구
                j = {
                    "criteria": "",
                    "subscores": {"correctness": 50, "completeness": 50, "clarity": 50, "practices": 50},
                    "total": 50,
                    "final_score": 2.5,
                    "feedback": f"auto-recovered: {e1} / {e2}"
                }

        j = _normalize_keys(j)

        # 후처리: 누락 필드/스케일 오류 보정
        subs = j.get("subscores") or {}
        def clamp_int(x, lo=0, hi=100):
            try: return max(lo, min(hi, int(x)))
            except: return 50

        corr = int(subs.get("correctness", 50))
        comp = int(subs.get("completeness", 50))
        clar = int(subs.get("clarity", 50))
        prac = int(subs.get("practices", 50))
        total = j.get("total")
        if not isinstance(total, (int, float)):
            total = round((corr + comp + clar + prac) / 4)
        final = j.get("final_score")
        if not isinstance(final, (int, float)):
            final = round(total / 20, 1)

        total = round((corr + comp + clar + prac) / 4)
        final = round(total / 20, 2)  # 0~5 스케일
        
        fb = (j.get("feedback") or "").lower()
        if total <= 60 and any(k in fb for k in ["clear", "detailed", "well-structured", "정확", "명확", "충분"]):
            total = max(total, 70)
            final = round(total / 20, 2)

        out = {
            "criteria": j.get("criteria", ""),
            "subscores": {"correctness": corr, "completeness": comp, "clarity": clar, "practices": prac},
            "total": int(total),
            "final_score": float(final),
            "feedback": j.get("feedback", "")
        }
        return {"raw": out}