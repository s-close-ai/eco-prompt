ds = load_dataset("LGCNS/KorQuAD_2.0", streaming=True)

import itertools
with open("korquad2_questions.jsonl","w",encoding="utf-8") as w:
    for r in itertools.islice(ds["train"], 0, None):  # 필요 시 상한 걸기
        rec = to_record(r)
        if not rec["question"]:
            continue
        w.write(json.dumps(rec, ensure_ascii=False) + "\n")
