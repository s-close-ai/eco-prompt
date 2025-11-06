# judge_llm/model/eval/build_kosimpleeval_batch.py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json, random, argparse
from datasets import load_dataset

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="HRB1_0", help="KoSimpleEval config (default: HRB1_0)")
    ap.add_argument("--n", type=int, default=16, help="샘플 개수")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--expand", action="store_true",
                    help="정답에 설명 템플릿을 덧붙여 길이를 늘림(부하 테스트용)")
    ap.add_argument("--out", default="batch.json")
    args = ap.parse_args()

    ds = load_dataset("HAERAE-HUB/KoSimpleEval", args.config)
    split_name = "test" if "test" in ds else ( "train" if "train" in ds else list(ds.keys())[0] )
    data = ds[split_name]

    # 컬럼 매핑
    qcands = ["question","instruction","prompt","input","query","task","problem","Q"]
    acands = ["answer","output","response","target","label","solution","gold","A"]

    cols = set(data.column_names)
    qcol = next((c for c in qcands if c in cols), None)
    acol = next((c for c in acands if c in cols), None)
    if not qcol or not acol:
        raise RuntimeError(f"지원 컬럼을 찾지 못했습니다. columns={list(cols)}  (q={qcol}, a={acol})")

    # 샘플링
    total = len(data)
    pick_pool = list(range(total))
    random.seed(args.seed); random.shuffle(pick_pool)
    idxs = pick_pool[:min(args.n, total)]

    items = []
    for i, idx in enumerate(idxs, start=1):
        row = data[idx]
        q = str(row[qcol]).strip()
        a = str(row[acol]).strip()

        # (옵션) 길이 확장: 평가 부하/토큰 테스트용
        if args.expand:
            a = (
                f"{a}\n\n"
                "설명: 위 답변은 질문의 요지를 충실히 반영하며, 핵심 근거를 간단히 정리했습니다. "
                "추가로 반례/한계, 실제 적용 시 주의사항, 베스트 프랙티스를 간단히 제시해 품질을 보강합니다. "
                "보안/성능/운영 관점에서의 체크리스트를 포함하여 Judge 모델이 일관되게 고득점하도록 돕습니다."
            )

        items.append({
            "pair_id": f"ke-{i:03d}",
            "question": q,
            "answer": a
        })

    payload = {
        "batch_id": f"kosimpleeval-{args.config}-{len(items)}",
        "threshold": 80,
        "items": items
    }

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"[OK] wrote {args.out} with {len(items)} items. split={split_name}, qcol={qcol}, acol={acol}")

if __name__ == "__main__":
    main()
