# app/adapters/judge_llm_http.py
from __future__ import annotations
from typing import Dict, Any, Optional
import os, re, json, httpx


def _extract_json_block(text: str) -> Dict[str, Any]:
    """
    모델 출력에서 JSON 블록만 추출 (```json ... ``` 혹은 중괄호 매칭 방식).
    """
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S | re.I)
    if m:
        return json.loads(m.group(1))

    # naive brace match (fallback)
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


def _to_total(fs: float, subs: Optional[Dict[str, int]]) -> int:
    """
    total = subscores(정확성/완전성/명료성/모범) 기반 가중 평균 (45/25/15/15)
    subscores가 없으면 final_score(1~5 또는 0.5 단위)를 0~100으로 변환
    """
    if isinstance(subs, dict):
        c = {k: int(max(0, min(100, float(subs.get(k, 0))))) for k in ["correctness", "completeness", "clarity", "practices"]}
        if len(c) == 4:
            return (45*c["correctness"] + 25*c["completeness"] + 15*c["clarity"] + 15*c["practices"]) // 100

    # fallback: 1~5 (or float 0~5) to 0~100
    return int(round((float(fs) / 5.0) * 100))


class HttpJudgeClient:
    """
    llama-server(OpenAI 호환 엔드포인트)로 Prometheus 2 평가 프롬프트 전송.

    환경 변수(.env)
      LLAMA_SERVER_URL      예: http://127.0.0.1:8080
      LLAMA_SERVER_MODEL    예: prom2
      JUDGE_MAX_TOKENS      기본 192
      JUDGE_TEMPERATURE     기본 0
      JUDGE_TIMEOUT_S       기본 40

    반환 형태:
      {"score": int(0~100),
       "feedback": str,
       "final_score": float(0~5),
       "subscores": dict or None,
       "raw": dict}
    """

    def __init__(self) -> None:
        base = os.getenv("LLAMA_SERVER_URL", "http://127.0.0.1:8080").rstrip("/")
        self.url = f"{base}/v1/chat/completions"
        self.model = os.getenv("LLAMA_SERVER_MODEL", "prom2")
        self.max_tokens = int(os.getenv("JUDGE_MAX_TOKENS", "192"))
        self.temperature = float(os.getenv("JUDGE_TEMPERATURE", "0"))
        self.timeout_s = int(os.getenv("JUDGE_TIMEOUT_S", "40"))

        limit = int(os.getenv("JUDGE_TEXT_LIMIT", "220"))
        # === 시스템 프롬프트 ===
        # - final_score는 0~5 float 가능 (예: 3.5)
        # - 각 subscores는 0~100 정수
        # - 한국어 Q/A면 한글 피드백 허용
        self.sys = (
            "You are Prometheus 2, a fair and objective evaluator. "
            "Return ONLY one JSON object with keys: "
            '{"criteria":"string","final_score":number(0~5, decimals ok),'
            '"feedback":"string","subscores":{"correctness":int(0~100),'
            '"completeness":int(0~100),"clarity":int(0~100),"practices":int(0~100)}}. '
            f"Each text field must be concise (<= {limit} chars). "
            "Write Korean feedback if the Q/A is in Korean. "
            "Do NOT include code fences, extra comments, or explanations."
        )

    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        """
        Judge LLM 호출 — Q/A 쌍 평가 후 JSON 결과 반환
        """
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
        j = _extract_json_block(content)

        # final_score 파싱 (0~5 float 허용)
        fs_raw = j.get("final_score")
        try:
            fs = float(fs_raw)
            if fs < 0 or fs > 5:
                raise ValueError
        except Exception:
            raise ValueError(f"invalid final_score: {fs_raw}")

        subs = j.get("subscores") if isinstance(j.get("subscores"), dict) else None
        total = _to_total(fs, subs)
        fb = str(j.get("feedback") or "").strip()

        return {
            "score": total,       # total (0~100)
            "final_score": fs,    # raw float 0~5
            "feedback": fb,
            "subscores": subs,
            "raw": j
        }
