# judge_llm/model/eval/judge_eval.py
import os, re, json, time, random
import numpy as np
import pandas as pd
import requests
from datasets import load_dataset
from tqdm import tqdm
from judge_prompts import build_mc_prompt, build_qa_prompt

JUDGE_SERVER = os.environ.get("LLAMA_SERVER", "http://127.0.0.1:8081")
N_SAMPLES    = int(os.environ.get("N_SAMPLES", "200"))
MAX_TOKENS   = int(os.environ.get("JUDGE_MAX_TOKENS", "96"))   # 짧게 줄여 지연 감소
TIMEOUT      = int(os.environ.get("TIMEOUT", "120"))

DATA_CONFIGS = os.environ.get("KSE_CONFIGS", "KMMLU,CLIcK,HRM_MATH").split(",")
SPLIT        = os.environ.get("KSE_SPLIT","test")

random.seed(42)

# llama.cpp 서버에 JSON 스키마 전달 (파싱 안정 + 조기 종료 유도)
JSON_SCHEMA = {
  "type": "object",
  "properties": {
    "score":   {"type": "integer", "minimum": 0, "maximum": 10},
    "correct": {"type": "boolean"},
    "reason":  {"type": "string"}
  },
  "required": ["score", "correct", "reason"],
  "additionalProperties": False
}

def call_judge(prompt: str) -> dict:
    payload = {
        "prompt": prompt,
        "n_predict": MAX_TOKENS,
        "temperature": 0.0,
        "cache_prompt": True,
        "stop": ["}\n", "}\r", "</s>"],  # JSON 닫힘에 맞춰 조기 종료
        "json_schema": JSON_SCHEMA       # ← llama-server가 지원 (llama.cpp 최신)
    }
    r = requests.post(f"{JUDGE_SERVER}/completion", json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    txt = r.json().get("content", "") or r.json().get("choices",[{}])[0].get("text","")
    m = re.search(r"\{[\s\S]*\}", txt)
    if not m:
        return {"score": 0, "correct": False, "reason": "no_json"}
    try:
        data = json.loads(m.group(0))
        s = int(max(0, min(10, int(data.get("score", 0)))))
        c = bool(data.get("correct", False))
        rsn = str(data.get("reason", ""))[:300]
        return {"score": s, "correct": c, "reason": rsn}
    except Exception:
        return {"score": 0, "correct": False, "reason": "bad_json"}

# --------- 공통 유틸 ---------
def norm(s): return re.sub(r"\s+"," ", str(s).strip())

def parse_opts_from_question(q: str) -> dict|None:
    opts = {}
    pattern = r"(\d+)\)\s*([^()\n]*?(?=(?:\s*\d+\)\s*)|$))"
    for m in re.finditer(pattern, q):
        idx = int(m.group(1)); txt = norm(m.group(2))
        if txt: opts[idx] = txt
    return opts or None

def pick_fields(ex):
    q_keys = ["question","input","prompt","query","instruction","text","Q","q","Problem","problem"]
    a_keys = ["gold","answer","output","label","target","solution","A","a"]
    q = next((ex.get(k) for k in q_keys if ex.get(k) not in (None,"")), None)
    a = next((ex.get(k) for k in a_keys if ex.get(k) not in (None,"")), None)
    return str(q) if q else None, a

def gold_to_text(gold, opts:dict|None):
    if gold is None: return None
    g = str(gold).strip()
    if opts and re.fullmatch(r"\d{1,2}", g):
        gi = int(g); return opts.get(gi, g)
    return g

def make_wrong_answer(gold_text:str, opts:dict|None, q_text:str)->str:
    # 객관식: 오답 보기
    if opts:
        vals = list(opts.values())
        wrongs = [v for v in vals if norm(v)!=norm(gold_text)]
        if wrongs: return random.choice(wrongs)
    # 주관식: 숫자면 ±1, 텍스트면 의미 다른 짧은 토큰
    m = re.fullmatch(r"[-+]?\d+(?:\.\d+)?", gold_text)
    if m:
        try:
            val = float(gold_text)
            if abs(val) < 1e6:
                return str(int(val)+1 if val.is_integer() else round(val+1.0, 6))
        except: pass
    return "없음"

# --------- 페어 생성(정답/오답) ---------
def build_pairs(ds, n_samples):
    idxs = list(range(len(ds))); random.shuffle(idxs); idxs = idxs[:n_samples]
    pairs = []
    for i in idxs:
        ex = ds[i]
        q, gold_raw = pick_fields(ex)
        if not q or gold_raw is None: continue
        opts = parse_opts_from_question(q)
        gold_text = gold_to_text(gold_raw, opts)
        if not gold_text: continue
        wrong_text = make_wrong_answer(gold_text, opts, q)

        # 레퍼런스(=gold_text)를 Judge에 함께 제공
        if opts:
            prompt_ok  = build_mc_prompt(q, opts, gold_text, gold_text)
            prompt_bad = build_mc_prompt(q, opts, gold_text, wrong_text)
        else:
            prompt_ok  = build_qa_prompt(q, gold_text, gold_text)
            prompt_bad = build_qa_prompt(q, gold_text, wrong_text)

        pairs.append({
            "q": q, "opts_present": bool(opts),
            "gold_text": gold_text, "wrong_text": wrong_text,
            "prompt_ok": prompt_ok, "prompt_bad": prompt_bad
        })
    return pairs

# --------- 평가 실행 ---------
def evaluate_pairs(pairs):
    rows = []
    for p in tqdm(pairs, desc="Judging"):
        t0 = time.time(); r_ok = call_judge(p["prompt_ok"]); t1 = time.time()
        r_bad = call_judge(p["prompt_bad"]); t2 = time.time()

        rows.append({
            "q": p["q"][:500],
            "opts_present": p["opts_present"],
            "gold_text": p["gold_text"],
            "wrong_text": p["wrong_text"],
            "ok_score": r_ok["score"],
            "ok_correct": r_ok["correct"],
            "ok_reason": r_ok["reason"],
            "bad_score": r_bad["score"],
            "bad_correct": r_bad["correct"],
            "bad_reason": r_bad["reason"],
            "lat_ok_s": round(t1 - t0, 3),
            "lat_bad_s": round(t2 - t1, 3),
        })
    return pd.DataFrame(rows)

# --------- 지표 ---------
def summarize(df: pd.DataFrame) -> dict:
    win = (df["ok_score"] > df["bad_score"]).mean() if len(df) else 0.0
    tie = (df["ok_score"] == df["bad_score"]).mean() if len(df) else 0.0
    auc = float(win + 0.5 * tie)
    consistency = ((df["ok_correct"] == True) & (df["bad_correct"] == False)).mean() if len(df) else 0.0
    lat = pd.concat([df["lat_ok_s"], df["lat_bad_s"]], ignore_index=True) if len(df) else pd.Series(dtype=float)
    p50 = float(np.median(lat)) if len(lat) else None
    p90 = float(np.quantile(lat, 0.9)) if len(lat) else None
    return {
        "n_pairs": int(len(df)),
        "pairwise_win_rate": round(win, 3),
        "pairwise_auc_approx": round(auc, 3),
        "consistency_ok_true_bad_false": round(consistency, 3),
        "latency_p50_s": round(p50, 3) if p50 is not None else None,
        "latency_p90_s": round(p90, 3) if p90 is not None else None,
    }

def run_one_config(cfg):
    print(f"\n=== Config: {cfg} ===")
    ds = load_dataset("HAERAE-HUB/KoSimpleEval", cfg)
    split = SPLIT if SPLIT in ds else next(iter(ds.keys()))
    data = ds[split]
    pairs = build_pairs(data, N_SAMPLES)
    df = evaluate_pairs(pairs)
    summ = summarize(df)
    print(json.dumps({"config": cfg, **summ}, ensure_ascii=False, indent=2))
    out_csv = f"judge_pairs_{cfg}_{split}.csv"
    out_json = f"judge_summary_{cfg}_{split}.json"
    df.to_csv(out_csv, index=False)
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump({"config": cfg, **summ}, f, ensure_ascii=False, indent=2)
    print(f"Saved: {out_csv}\nSaved: {out_json}")

def main():
    for cfg in [c.strip() for c in DATA_CONFIGS if c.strip()]:
        run_one_config(cfg)

if __name__ == "__main__":
    main()
