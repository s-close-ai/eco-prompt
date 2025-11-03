from datasets import load_dataset
from itertools import islice
import json

# 스트리밍으로 보면 전체 다운로드 없이 구조만 확인 가능
ds = load_dataset("LGCNS/KorQuAD_2.0", streaming=True)

def peek(split, n=3):
    it = islice(ds[split], n)
    for i, r in enumerate(it, 1):
        print(f"\n[{split} sample {i}] keys:", sorted(r.keys()))
        # 중첩 키가 어떻게 생겼는지 일부만 출력
        for k in ("id","question","answers","context","title"):
            if k in r:
                print(f"  {k} =", json.dumps(r[k], ensure_ascii=False)[:300])

peek("train", 2)
peek("validation", 2)
