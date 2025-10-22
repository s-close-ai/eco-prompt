# app.py
import os, json, re, concurrent.futures, threading
from typing import List, Optional, Dict, Any, Callable
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from llama_cpp import Llama, LlamaGrammar

# 설정
DEFAULT_MODEL = "./prom2-f16.gguf"
DEF_THREADS   = int(os.getenv("JUDGE_N_THREADS", "8"))
DEF_MAXTOK    = min(int(os.getenv("JUDGE_MAX_TOKENS", "192")), 512)  # 하드캡
DEF_TEMP      = float(os.getenv("JUDGE_TEMPERATURE", "0"))
DEF_GPU_LAY   = int(os.getenv("JUDGE_N_GPU_LAYERS", "-1"))
DEF_SEED      = int(os.getenv("JUDGE_SEED", "0"))
CALL_TIMEOUT  = int(os.getenv("JUDGE_TIMEOUT_S", "40"))  # 항목별 타임아웃(초)

# 텍스트 길이 제한
TEXT_LIMIT    = int(os.getenv("JUDGE_TEXT_LIMIT", "220"))
PROMPT_Q_MAX  = int(os.getenv("JUDGE_Q_MAX_CHARS", "4000"))
PROMPT_A_MAX  = int(os.getenv("JUDGE_A_MAX_CHARS", "4000"))

# total 정책: subs_pref | fs_if_zero
TOTAL_POLICY  = os.getenv("JUDGE_TOTAL_PRIORITY", "fs_if_zero").lower()

# 가중치(합 100) - Prometheus 2 모델의 기본 채점 체계
W_CORRECTNESS  = int(os.getenv("JUDGE_W_CORRECTNESS", "45"))
W_COMPLETENESS = int(os.getenv("JUDGE_W_COMPLETENESS", "25"))
W_CLARITY      = int(os.getenv("JUDGE_W_CLARITY", "15"))
W_PRACTICES    = int(os.getenv("JUDGE_W_PRACTICES", "15"))
assert W_CORRECTNESS + W_COMPLETENESS + W_CLARITY + W_PRACTICES == 100, "Rubric weights must sum to 100"

# 시스템 프롬프트(간결+한글)
BASE_SYSTEM_PROMPT = (
    'You are Prometheus 2 for coding tasks. '
    'Return ONLY a JSON: {"criteria":"string","final_score":1-5,"feedback":"string","subscores":{"correctness":0-100,"completeness":0-100,"clarity":0-100,"practices":0-100}}. '
    'If the Question or Answer is Korean, write criteria/feedback in natural Korean. '
    'No placeholders. No text outside JSON. '
    f'Each of "criteria" and "feedback" MUST be concise (<= {TEXT_LIMIT} characters). '
    'Scoring focus: correctness, completeness, clarity, best practices & security.'
)

# JSON 문법(GBNF) - 앞뒤 공백 허용
JSON_GBNF = r"""
ws              ::= (" " | "\n" | "\r" | "\t")*
root            ::= ws object ws
object          ::= "{" members? "}"
members         ::= pair ("," pair)*
pair            ::= key ":" value
key             ::= "\"criteria\"" | "\"final_score\"" | "\"feedback\"" | "\"subscores\""
value           ::= string | int1to5 | subscores
subscores       ::= "{" s_members "}"
s_members       ::= s_pair ("," s_pair)*
s_pair          ::= s_key ":" s_val
s_key           ::= "\"correctness\"" | "\"completeness\"" | "\"clarity\"" | "\"practices\""
s_val           ::= int0to100
int1to5         ::= "1" | "2" | "3" | "4" | "5"
int0to100       ::= "100" | digit2 | digit1 | "0"
digit1          ::= "1".."9"
digit2          ::= digit1 digit
digit           ::= "0".."9"
string          ::= "\"" chars "\""
chars           ::= ( char )*
char            ::= escape | ~["\\\x00-\x1F]
escape          ::= "\\" ( "\"" | "\\" | "/" | "b" | "f" | "n" | "r" | "t" )
"""

# 최소 JSON(보급형) - subscores 제외
JSON_GBNF_MIN = r"""
ws      ::= (" " | "\n" | "\r" | "\t")*
root    ::= ws object ws
object  ::= "{" members "}"
members ::= p1 ("," p2) ("," p3)
p1      ::= "\"criteria\"" ":" string
p2      ::= "\"final_score\"" ":" int1to5
p3      ::= "\"feedback\"" ":" string
int1to5 ::= "1" | "2" | "3" | "4" | "5"
string  ::= "\"" chars "\""
chars   ::= ( char )*
char    ::= escape | ~["\\\x00-\x1F]
escape  ::= "\\" ( "\"" | "\\" | "/" | "b" | "f" | "n" | "r" | "t" )
"""

# 스키마
class JudgeItem(BaseModel):
    pair_id: str
    question: str
    answer: str

class JudgeRequest(BaseModel):
    batch_id: str
    threshold: int = Field(80, ge=0, le=100)
    items: List[JudgeItem]

class JudgeResult(BaseModel):
    pair_id: str
    total: Optional[int] = None
    feedback: Optional[str] = None
    trainable: Optional[bool] = None
    raw: Optional[dict] = None
    error: Optional[str] = None

class JudgeResponse(BaseModel):
    batch_id: str
    processed: int
    success: int
    failed: int
    results: List[JudgeResult]

# 유틸
def _is_korean(text: str) -> bool:
    return any('가' <= ch <= '힣' for ch in text)

def _truncate(s: str, n: int) -> str:
    s = (s or "").strip()
    return s if len(s) <= n else s[:n]

def _truncate_middle(text: str, max_chars: int) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    keep = max_chars // 2
    return text[:keep] + "\n...\n" + text[-keep:]

def _extract_json_block(text: str) -> str:
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.S | re.I)
    if m:
        return m.group(1)
    start = text.find("{")
    if start == -1:
        raise ValueError(f"No JSON object found: head={text[:120]!r}")
    depth = 0; buf = []
    s = text[start:]
    for ch in s:
        buf.append(ch)
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return "".join(buf)
    repaired = "".join(buf) + ("}" * max(depth, 0))
    try:
        json.loads(repaired)
        return repaired
    except Exception:
        raise ValueError(f"No JSON object found: head={text[:120]!r}")

def _validate_and_normalize(data: Dict[str, Any]) -> Dict[str, Any]:
    if "criteria" not in data or "final_score" not in data or "feedback" not in data:
        raise ValueError("Missing required keys")

    placeholder_pat = re.compile(r"\(.*(short reasoning|constructive feedback).*\)", re.I)
    bad_literals = {"string", "text", "내용", "설명"}
    if placeholder_pat.search(str(data.get("criteria",""))) or placeholder_pat.search(str(data.get("feedback",""))):
        raise ValueError("Placeholder content detected")
    if str(data.get("criteria","")).strip().lower() in bad_literals:
        raise ValueError("Placeholder content detected")
    if str(data.get("feedback","")).strip().lower() in bad_literals:
        raise ValueError("Placeholder content detected")

    fs = data["final_score"]
    if isinstance(fs, str) and "/" in fs:
        num, den = fs.split("/")
        fs = round((int(num)/int(den))*5)
    if isinstance(fs, float):
        fs = round(fs)
    if not isinstance(fs, int) or not (1 <= fs <= 5):
        raise ValueError(f"invalid final_score: {fs}")

    subs = data.get("subscores")
    norm_subs = None
    if isinstance(subs, dict):
        def clamp01(x):
            try:
                v = float(x)
            except Exception:
                return None
            v = max(0.0, min(100.0, v))
            return int(round(v))
        c1 = clamp01(subs.get("correctness"))
        c2 = clamp01(subs.get("completeness"))
        c3 = clamp01(subs.get("clarity"))
        c4 = clamp01(subs.get("practices"))
        if None not in (c1, c2, c3, c4):
            norm_subs = {"correctness": c1, "completeness": c2, "clarity": c3, "practices": c4}

    data["criteria"] = _truncate(str(data.get("criteria","")), TEXT_LIMIT)
    data["feedback"] = _truncate(str(data.get("feedback","")), TEXT_LIMIT)

    data["final_score"] = fs
    if norm_subs is not None:
        data["subscores"] = norm_subs
    else:
        data.pop("subscores", None)
    return data

def _to_total(fs: int, subs: Optional[Dict[str,int]]) -> int:
    if isinstance(subs, dict) and len(subs) == 4:
        ssum = subs.get("correctness",0) + subs.get("completeness",0) + subs.get("clarity",0) + subs.get("practices",0)
        if TOTAL_POLICY == "fs_if_zero" and ssum == 0:
            return int(round((fs/5)*100))
        total = (
            subs.get("correctness", 0)  * W_CORRECTNESS +
            subs.get("completeness", 0) * W_COMPLETENESS +
            subs.get("clarity", 0)      * W_CLARITY +
            subs.get("practices", 0)    * W_PRACTICES
        ) // 100
        return int(total)
    return int(round((fs/5)*100))

def _print_kperf(usage: Dict[str, Any], timings: Dict[str, Any]) -> None:
    pt = usage.get("prompt_tokens"); ct = usage.get("completion_tokens"); tt = usage.get("total_tokens")
    pm = timings.get("prompt_ms"); pn = timings.get("prompt_n")
    gm = timings.get("predicted_ms") or timings.get("generation_ms") or timings.get("eval_ms")
    gn = timings.get("predicted_n")  or timings.get("generation_n")  or timings.get("eval_n")
    tm = timings.get("total_ms")
    print("=== 성능 요약 ===")
    if pm is not None and pn is not None:
        per = pm/pn if pn else None; tps = (1000.0/per) if per else None
        print(f"- 프롬프트 처리: {pm:.2f} ms / {pn} 토큰" + (f" (토큰당 {per:.2f} ms, 초당 {tps:.2f})" if per and tps else ""))
    if gm is not None and gn is not None:
        per = gm/gn if gn else None; tps = (1000.0/per) if per else None
        print(f"- 생성 처리: {gm:.2f} ms / {gn} 토큰" + (f" (토큰당 {per:.2f} ms, 초당 {tps:.2f})" if per and tps else ""))
    if tm is not None and tt is not None:
        print(f"- 전체: {tm:.2f} ms / 총 {tt} 토큰")
    if pt is not None and ct is not None and tt is not None:
        print(f"- 사용 토큰: 프롬프트 {pt}, 생성 {ct}, 전체 {tt}")
    print("================")

# App / Model
app = FastAPI(title="Judge LLM (llama-cpp-python)")
llm: Optional[Llama] = None
loaded_model_path: Optional[str] = None
GRAMMAR_OBJ: Optional[LlamaGrammar] = None
GRAMMAR_OBJ_MIN: Optional[LlamaGrammar] = None

@app.on_event("startup")
def load_model():
    # 모델 로드
    global llm, loaded_model_path, GRAMMAR_OBJ, GRAMMAR_OBJ_MIN
    model_path   = os.getenv("JUDGE_MODEL", DEFAULT_MODEL)
    n_gpu_layers = int(os.getenv("JUDGE_N_GPU_LAYERS", str(DEF_GPU_LAY)))
    n_threads    = int(os.getenv("JUDGE_N_THREADS",  str(DEF_THREADS)))
    seed         = int(os.getenv("JUDGE_SEED",      str(DEF_SEED)))

    GRAMMAR_OBJ     = LlamaGrammar.from_string(JSON_GBNF)
    GRAMMAR_OBJ_MIN = LlamaGrammar.from_string(JSON_GBNF_MIN)

    if not os.path.exists(model_path):
        loaded_model_path = model_path
        return

    llm = Llama(
        model_path=model_path,
        n_gpu_layers=n_gpu_layers,
        n_threads=n_threads,
        n_ctx=int(os.getenv("JUDGE_N_CTX", "8192")),
        n_batch=int(os.getenv("JUDGE_N_BATCH", "512")),
        n_parallel=int(os.getenv("JUDGE_N_PARALLEL", "1")),
        seed=seed,
        verbose=False
    )
    loaded_model_path = model_path
    print(f"[모델 로드] {model_path} (스레드={n_threads}, GPU계층={n_gpu_layers})")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": loaded_model_path or os.getenv("JUDGE_MODEL", DEFAULT_MODEL),
        "loaded": llm is not None,
        "threads": DEF_THREADS,
        "max_tokens": DEF_MAXTOK,
        "temperature": DEF_TEMP,
        "gpu_layers": DEF_GPU_LAY,
        "n_ctx": int(os.getenv("JUDGE_N_CTX", "8192")),
        "n_batch": int(os.getenv("JUDGE_N_BATCH", "512")),
        "n_parallel": int(os.getenv("JUDGE_N_PARALLEL", "1")),
        "text_limit": TEXT_LIMIT,
        "prompt_q_max": PROMPT_Q_MAX,
        "prompt_a_max": PROMPT_A_MAX,
        "timeout_s": CALL_TIMEOUT,
        "total_policy": TOTAL_POLICY,
        "weights": {
            "correctness": W_CORRECTNESS,
            "completeness": W_COMPLETENESS,
            "clarity": W_CLARITY,
            "practices": W_PRACTICES
        }
    }

def _call_with_timeout(fn: Callable[[], Dict[str, Any]], timeout_s: int) -> Dict[str, Any]:
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
        fut = ex.submit(fn)
        return fut.result(timeout=timeout_s)

@app.post("/api/judge/batch", response_model=JudgeResponse)
def judge_batch(req: JudgeRequest):
    # 배치 평가
    if llm is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    results: List[JudgeResult] = []
    success = 0

    for it in req.items:
        # 언어 힌트
        lang_hint = "Respond in Korean." if (_is_korean(it.question) or _is_korean(it.answer)) else "Respond in English."

        # 길이 가드
        q = _truncate_middle(it.question, PROMPT_Q_MAX)
        a = _truncate_middle(it.answer,   PROMPT_A_MAX)

        user_prompt = (
            f"Q:\n{q}\n\nA:\n{a}\n\n"
            "Evaluate for correctness, completeness, clarity, best practices & security.\n"
            f"{lang_hint} Output ONLY the JSON."
        )

        def infer_once(sys_prompt: str, grammar_obj) -> Dict[str, Any]:
            out = llm.create_chat_completion(
                messages=[{"role": "system", "content": sys_prompt},
                          {"role": "user", "content": user_prompt}],
                temperature=DEF_TEMP,
                max_tokens=DEF_MAXTOK,
                # grammar=grammar_obj,
                # response_format={"type": "json_object"},
            )
            usage = out.get("usage", {}) or {}
            timings = out.get("timings", {}) or {}
            _print_kperf(usage, timings)

            content = out["choices"][0]["message"]["content"]
            data = json.loads(_extract_json_block(content))
            return _validate_and_normalize(data)

        try:
            data = _call_with_timeout(lambda: infer_once(BASE_SYSTEM_PROMPT, GRAMMAR_OBJ), CALL_TIMEOUT)
        except Exception:
            strict_sys = (
                'Return ONLY valid JSON with keys {"criteria","final_score","feedback","subscores"}. '
                f'No extra text. No code fences. No placeholders. Each string <= {TEXT_LIMIT} chars. '
                "final_score MUST be 1..5. If Korean appears, write Korean."
            )
            try:
                data = _call_with_timeout(lambda: infer_once(strict_sys, GRAMMAR_OBJ), CALL_TIMEOUT)
            except Exception as e2:
                # 최후: 최소 JSON
                minimal_sys = (
                    'Return ONLY valid JSON with EXACTLY keys {"criteria","final_score","feedback"}. '
                    f'No extra text. No code fences. No placeholders. Each string <= {TEXT_LIMIT} chars. '
                    "final_score MUST be 1..5."
                )
                try:
                    data = _call_with_timeout(lambda: infer_once(minimal_sys, GRAMMAR_OBJ_MIN), CALL_TIMEOUT)
                except Exception as e3:
                    results.append(JudgeResult(pair_id=it.pair_id, error=str(e3)))
                    continue

        fs = data["final_score"]
        subs = data.get("subscores")
        total = _to_total(fs, subs)
        trainable = (total >= req.threshold)

        results.append(JudgeResult(
            pair_id=it.pair_id,
            total=total,
            feedback=data.get("feedback"),
            trainable=trainable,
            raw=data
        ))
        success += 1

    return JudgeResponse(
        batch_id=req.batch_id,
        processed=len(req.items),
        success=success,
        failed=len(req.items)-success,
        results=results
    )
