# app.py
import os, json
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from llama_cpp import Llama

# ---- Config (env) ----
MODEL_PATH   = os.getenv("JUDGE_MODEL", "./prom2-f16.gguf")
N_THREADS    = int(os.getenv("JUDGE_N_THREADS", "8"))
MAX_TOKENS   = int(os.getenv("JUDGE_MAX_TOKENS", "256"))
TEMPERATURE  = float(os.getenv("JUDGE_TEMPERATURE", "0"))

# ---- Prometheus 2 스타일 시스템 프롬프트 ----
SYSTEM_PROMPT = (
    "You are an evaluation model (Prometheus 2) that grades answers on a scale of 1 to 5. "
    "You must analyze the provided Question and Answer carefully and respond ONLY with a valid JSON object:\n"
    '{"criteria":"(short reasoning)", "final_score":(1-5 integer), "feedback":"(constructive feedback)"}\n'
    "Do not include any text outside the JSON object."
)

# ---- Schemas ----
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

# ---- App / Model ----
app = FastAPI(title="Judge LLM (llama-cpp-python)")
llm: Optional[Llama] = None

@app.on_event("startup")
def load_model():
    global llm
    if not os.path.exists(MODEL_PATH):
        return
    llm = Llama(model_path=MODEL_PATH, n_gpu_layers=N_GPU_LAYERS, n_threads=N_THREADS, seed=0)

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_PATH, "loaded": llm is not None}

@app.post("/api/judge/batch", response_model=JudgeResponse)
def judge_batch(req: JudgeRequest):
    if llm is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    results, success = [], 0
    for it in req.items:
        user_prompt = (
            f"### Question:\n{it.question.strip()}\n\n"
            f"### Answer:\n{it.answer.strip()}\n\n"
            "### Evaluation:\nEvaluate the answer on accuracy, completeness, clarity, and relevance. "
            "Return JSON now."
        )
        try:
            out = llm.create_chat_completion(
                messages=[{"role":"system","content": SYSTEM_PROMPT},
                          {"role":"user","content": user_prompt}],
                temperature=TEMPERATURE,
                max_tokens=MAX_TOKENS
            )
            content = out["choices"][0]["message"]["content"]
            s, e = content.find("{"), content.rfind("}")
            data = json.loads(content[s:e+1])

            fs = data.get("final_score")
            if isinstance(fs, str) and "/" in fs:
                num, den = fs.split("/")
                fs = round((int(num)/int(den))*5)
            if isinstance(fs, float):
                fs = round(fs)
            total = int(round((fs/5)*100)) if isinstance(fs, int) else None
            trainable = (total is not None and total >= req.threshold)

            results.append(JudgeResult(
                pair_id=it.pair_id, total=total, feedback=data.get("feedback"),
                trainable=trainable, raw=data
            ))
            success += 1
        except Exception as e:
            results.append(JudgeResult(pair_id=it.pair_id, error=str(e)))

    return JudgeResponse(
        batch_id=req.batch_id, processed=len(req.items),
        success=success, failed=len(req.items)-success, results=results
    )
