# eval_kosimple.py (전체 교체)
import re, time, json, requests, random, os
from datasets import load_dataset
from tqdm import tqdm

SERVER      = os.environ.get("LLAMA_SERVER","http://127.0.0.1:8081")
CONFIG      = os.environ.get("KSE_CONFIG","KMMLU")
SPLIT       = os.environ.get("KSE_SPLIT","test")
N_SAMPLES   = int(os.environ.get("N_SAMPLES","200"))
MAX_TOKENS  = int(os.environ.get("MAX_TOKENS","128"))
TIMEOUT     = int(os.environ.get("TIMEOUT","120"))

# -------------------- 유틸 --------------------
LETTER2IDX = {c:i+1 for i,c in enumerate(list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"))}

def norm(s):
    s = str(s)
    s = s.strip()
    # 공백/괄호/마침표 등 단순 표기차 제거
    s = re.sub(r"\s+", " ", s)
    s = s.replace("．",".").replace("：",":").replace("，",",")
    return s

def parse_opts_from_question(q):
    """
    질문 본문 속 '1) ... 2) ...' 패턴을 모두 추출해 {번호: 텍스트} 딕셔너리로 리턴
    """
    opts = {}
    # 줄바꿈이 없을 수도 있어 전체에서 탐색
    # 패턴: 1) 텍스트(다음 번호 또는 문장 끝 전까지)
    pattern = r"(\d+)\)\s*([^()\n]*?(?=(?:\s*\d+\)\s*)|$))"
    for m in re.finditer(pattern, q):
        idx = int(m.group(1))
        txt = norm(m.group(2))
        if txt:
            opts[idx] = txt
    return opts if opts else None

def detect_mc_from_question(q):
    return bool(re.search(r"\n?\s*1\)\s", q)) or bool(re.search(r"\s[1-9]\)\s", q))

def letter_or_number(s):
    """
    모델 출력에서 선택지 'A/B/C/D' 또는 '1/2/3/4'를 최대한 회수
    우선순위: 단일 대문자 -> 숫자 -> 'n) '앞의 숫자
    """
    t = s.strip()
    m = re.search(r"\b([A-Z])\b", t)
    if m: 
        return LETTER2IDX.get(m.group(1)), "idx"
    m = re.search(r"\b(\d{1,2})\b", t)
    if m:
        try:
            return int(m.group(1)), "idx"
        except:
            pass
    m = re.search(r"^(\d{1,2})\)", t)
    if m:
        try:
            return int(m.group(1)), "idx"
        except:
            pass
    return None, None

def map_text_to_option_idx(pred_text, opts):
    """
    모델이 보기 텍스트로 답했을 때, 가장 잘 매칭되는 번호를 찾음(부분 포함 우선).
    """
    pt = norm(pred_text)
    # 완전 일치 우선
    for k,v in opts.items():
        if pt == v:
            return k
    # 부분 포함(좌우 여백·문장부호 차이 보정)
    for k,v in opts.items():
        if pt in v or v in pt:
            return k
    return None

def coerce_gold(gold_raw, opts):
    """
    gold를 숫자 인덱스(가능하면)로 정규화.
    - '3' / 3 -> 3
    - 'C' -> 3
    - 텍스트(보기문) -> 해당 인덱스
    - 그 외 -> 원문 문자열로 유지
    """
    if gold_raw is None:
        return None, "raw"
    g = str(gold_raw).strip()
    # 숫자
    if re.fullmatch(r"\d{1,2}", g):
        return int(g), "idx"
    # 알파벳
    if re.fullmatch(r"[A-Z]", g):
        return LETTER2IDX.get(g), "idx" if g in LETTER2IDX else (g, "raw")
    # 보기 텍스트 가능성
    if opts:
        gi = map_text_to_option_idx(g, opts)
        if gi is not None:
            return gi, "idx"
    return g, "raw"

def pick_fields(example):
    # 질문
    q_candidates = ["question","input","prompt","query","instruction","text","Q","q","Problem","problem"]
    # 정답: gold가 핵심!
    a_candidates = ["gold","answer","output","label","target","solution","A","a"]
    q = next((example.get(k) for k in q_candidates if example.get(k) not in (None,"")), None)
    a = next((example.get(k) for k in a_candidates if example.get(k) not in (None,"")), None)

    # 보기 컬럼이 있으면 사용 (대부분은 질문에만 존재)
    opt_keys = ["options","choices","Options","option","choice"]
    opts = None
    for k in opt_keys:
        if k in example and example[k]:
            opts = example[k]
            break
    return q, a, opts

# -------------------- 모델 호출 --------------------
def infer(prompt:str)->str:
    payload = {
        "prompt": prompt,
        "n_predict": MAX_TOKENS,
        "temperature": 0.0,
        "stop": ["\n\n"]
    }
    r = requests.post(f"{SERVER}/completion", json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    data = r.json()
    if "content" in data:
        return data["content"]
    if "choices" in data and data["choices"]:
        return data["choices"][0].get("text","")
    return str(data)

# -------------------- 프롬프트 --------------------
def build_prompt(q, opts_in_q:bool, extracted_opts):
    """
    - 객관식 패턴 감지 시: '번호만 출력'을 매우 강하게 요구
    - 그 외: 한 줄 정답
    """
    if opts_in_q or extracted_opts:
        return (
            "다음 문제의 정답을 선택지의 **번호만** 출력하세요.\n"
            "절대 해설/문장/기호를 덧붙이지 말고, 오직 숫자만 출력하세요.\n"
            "문제:\n" + q + "\n정답 번호:"
        )
    else:
        return (
            "다음 문제의 최종 정답만 한 줄로 출력하세요. 설명/근거/단계는 절대 쓰지 마세요.\n"
            "문제: " + q + "\n정답:"
        )

# -------------------- 평가 --------------------
def evaluate_one(example):
    q, gold_raw, opts_col = pick_fields(example)
    if not q or gold_raw is None:
        return None

    q = str(q)
    # 질문 본문에서 보기 추출
    extracted_opts = parse_opts_from_question(q)
    mc = detect_mc_from_question(q) or bool(extracted_opts)

    prompt = build_prompt(q, mc, extracted_opts)
    t0 = time.time()
    pred_raw = infer(prompt)
    lat = time.time() - t0

    pred_raw = str(pred_raw).strip()
    pred_idx = None
    pred_text = pred_raw

    # 1) 숫자/알파벳 시도
    if mc:
        idx, kind = letter_or_number(pred_raw)
        if idx is not None:
            pred_idx = idx
        # 2) 텍스트 → 보기 매핑
        elif extracted_opts:
            gi = map_text_to_option_idx(pred_raw, extracted_opts)
            if gi is not None:
                pred_idx = gi

    # gold 정규화
    gold_idx, gold_kind = coerce_gold(gold_raw, extracted_opts)

    # 채점
    ok = 0
    if mc:
        if isinstance(gold_idx, int) and pred_idx is not None:
            ok = int(pred_idx == gold_idx)
        else:
            # 마지막 보험: 문자열 대 문자열 비교
            ok = int(norm(pred_text) == norm(str(gold_raw)))
    else:
        ok = int(norm(pred_text) == norm(str(gold_raw)))

    # 결과 표준화된 예시 출력용 필드
    show_pred = str(pred_idx) if pred_idx is not None else pred_text
    show_gold = str(gold_idx) if isinstance(gold_idx, int) else str(gold_raw)

    return {
        "mode": "mc" if mc else "qa",
        "q": q,
        "opts_present": bool(extracted_opts),
        "gold": show_gold,
        "pred": show_pred,
        "ok": ok,
        "latency_s": round(lat,3),
    }

def main():
    ds = load_dataset("HAERAE-HUB/KoSimpleEval", CONFIG)
    split_name = SPLIT if SPLIT in ds else next(iter(ds.keys()))
    d = ds[split_name]

    idxs = list(range(len(d)))
    random.seed(42); random.shuffle(idxs)
    idxs = idxs[:N_SAMPLES]

    total = hit = 0
    latencies = []
    rows = []
    debug = []

    for i in tqdm(idxs, desc=f"Evaluating[{CONFIG}/{split_name}]"):
        ex = d[i]
        res = evaluate_one(ex)
        if not res: 
            continue
        rows.append(res)
        total += 1
        hit   += res["ok"]
        latencies.append(res["latency_s"])
        if len(debug) < 10:
            debug.append({k:res[k] for k in ["mode","q","opts_present","gold","pred","ok","latency_s"]})

    acc = (hit/total)*100 if total else 0.0
    lat_p50 = sorted(latencies)[int(0.5*len(latencies))] if latencies else None
    lat_p90 = sorted(latencies)[int(0.9*len(latencies))] if latencies else None

    print(json.dumps({
        "config": CONFIG,
        "split": split_name,
        "n_total": total,
        "n_correct": hit,
        "accuracy_pct": round(acc,2),
        "latency_p50_s": round(lat_p50,3) if lat_p50 else None,
        "latency_p90_s": round(lat_p90,3) if lat_p90 else None,
        "mode": "auto",
        "debug_samples": debug
    }, ensure_ascii=False, indent=2))

    try:
        import pandas as pd
        pd.DataFrame(rows).to_csv(f"kosimpleeval_{CONFIG}_{split_name}.csv", index=False)
        print(f"Saved: kosimpleeval_{CONFIG}_{split_name}.csv")
    except Exception as e:
        print("CSV save skipped:", e)

if __name__ == "__main__":
    main()