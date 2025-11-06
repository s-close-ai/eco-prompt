from datasets import load_dataset
import pandas as pd

ds = load_dataset("LGCNS/KorQuAD_2.0")  # train/dev 스플릿 포함

# KorQuAD 2.0 항목: title, context, question, id, answers 등

def to_df(split):
    q = split.to_pandas()
    # question / id / (선택) context / reference answer
    q["ref_answer"] = q["answers"].apply(lambda a: a["text"][0] if a and a["text"] else "")
    return q[["id", "question", "ref_answer", "context"]]

train = to_df(ds["train"])
dev   = to_df(ds["validation"])
df = pd.concat([train, dev], ignore_index=True)

# 중복/공백 정리
df["question"] = df["question"].str.strip()
df = df.drop_duplicates(subset=["question"]).reset_index(drop=True)

print(df.head())
