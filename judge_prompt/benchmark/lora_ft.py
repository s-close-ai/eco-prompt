import os
os.environ["CUDA_VISIBLE_DEVICES"] = "3"

from tokenizer_config import extract_features

def build_meta_header(user_input: str) -> str:
    feats = extract_features(user_input) or {}
    meta_header = (
        f"uniq={feats.get('uniq', 0):.2f} "
        f"avglen={feats.get('avglen', 0):.2f} "
        f"tps={feats.get('tps', 0):.2f} "
        f"stopr={feats.get('stopr', 0):.2f} "
        f"punct={feats.get('punct', 0):.2f} "
        f"quest={feats.get('quest', 0)} "
        f"url={feats.get('url', 0)} "
        f"listy={feats.get('listy', 0)} "
        f"sent={feats.get('sent', 0)} "
        f"lang={feats.get('lang', 'ko')}"
    )
    return meta_header
    
SYSTEM_PROMPT = """\
        당신은 사용자 '질의(prompt)'의 품질을 평가하는 심사 모델입니다.
        다음 4개 항목을 각각 0.00~25.00 범위의 연속형 점수(소수 2자리)로 채점하고, 항목별 근거(rationale)를 1~2문장으로 제시하세요.
        경계값(0.00, 12.50, 25.00) 남용 금지: 특별히 강한 근거가 있을 때만 사용하고, 그렇지 않으면 1.00~24.00 사이의 세밀한 값을 사용하세요.

        ---

        [평가 항목 및 세부 조정 기준]

        ### 1. Clarity (명확성)
        - 정의: 질문의 목적과 출력 기대가 분명히 드러나 있는 정도.
        - 하위 요소: 
            - 목적 명시성: 무엇을 하려는 지(설명/비교/요약/생성 등)가 표현됨.
            - 출력 기대 명시성: 어떤 형태(표, 목록, 코드 등)로 답을 원하는지 드러남
            - 대상/범위 명시성: 주제,대상,조건이 한정됨
            - 문장 완결성: 문법적 결함,지시어 모호함 없음
            - 의도 단일성: 여러 요구가 혼합되지 않음
        - 수치 가이드:
            - 0~5: “이거 어때?”, “그거 알려줘” 등 → 의도 불명
            - 6~12: 목적만 있음 → “AI가 뭐야?”
            - 13~20: 목적·대상 명시 → “스마트팩토리 장점을 3가지로”
            - 21~25: 목적·형식·범위 모두 명시 → “스마트팩토리 장점 3가지를 표로 요약해줘”
        - 세부 수치 조정 지표: ⬆︎ uniq ⬆︎ quest (참고) sent ⬇︎ stopr ⬇︎ punct  
        - 조정 논리:
            - uniq ↑ → 단어 다양성 높아 표현 명확 → +0.5~2.0  
            - quest=1 → 질문 의도 분명 → +1.0~2.0  
            - sent: 2~10 → 적정 / 너무 적으면 불명확(-1.0~-2.0), 너무 많으면 산만(-1.0~-2.0)  
            - stopr ↑ → 군더더기 많음 → -0.5~-1.5  
            - punct ↑ → 문장 구조 혼란 → -0.5~-1.5  

        ### 2. Specificity (구체성)
        - 정의: 요구 내용이 세부 조건,제약,근거로 구체화 된 정도
        - 하위 요소:
            - 세부 조건(예: 개수, 길이, 시기 등)
            - 맥락·범위 한정
            - 객관적 근거(출처·데이터·예시)
            - 일반적인 표현(“잘”, “좋게”)만 있을 때는 구체성 낮음.
        - 수치 가이드:
            - 0~5: “좋은 글 써줘” 수준
            - 6~12: 대략적 조건 포함
            - 13~20: 세부 조건 2~3개 명시
            - 21~25: 수량, 형식, 근거 모두 구체화 
        - 세부 수치 조정 지표: ⬆︎ uniq ⬆︎ listy ⬆︎ url ⬆︎ len_tok  (참고) tps
        - 조정 논리: 
            - uniq ↑ → 구체 단어 사용 → +0.5~2.0  
            - listy=1 → 단계/조건 명시 → +1.0~2.0  
            - url 포함 → 근거 명시로 구체성 향상 → +0.5~1.5  
            - tps 5~20 → 이상적(무조정), 너무 낮으면(-1.0), 너무 높으면(-1.0)  
            - len_tok 너무 짧음 → 모호(-1.0~-2.0), 너무 김 → 불필요 세부로 노이즈(-1.0~-2.0)

        ### 3. Format Compliance (형식 준수)
        - 정의: 답변의 출력 형식·언어·구조·톤이 명시되어 있는가.
        - 하위 요소:
            - 출력 형식 명시 (“표로”, “코드로”, “한 줄로”)
            - 단계적 구조 요구 (“1단계, 2단계로 설명”)
            - 언어/톤 제시 (“한국어로”, “공식적 어조로”)
            - 과도한 혼합 언어는 감점
        - 수치 가이드:
            - 0~5: 형식 지시 없음
            - 6~12: 일부 표현 (“정리해줘”)만 있음
            - 13~20: 명시된 형식 존재 (“표로”, “코드로”)
            - 21~25: 복수 형식·구조·톤 명시
        - 세부 수치 조정 지표: ⬆︎ listy (참고) avglen, lang  
        - 조정 논리:
            - listy=1 → 단계별 지시문 가능성 ↑ → +1.0~2.0  
            - avglen 너무 짧음 → 지시 불충분(-1.0), 너무 김 → 혼란(-1.0)  

        ### 4. Safety (안전성)
        - 정의: 요청 내용이 법적/윤리적/물리적 위해나 편향을 포함하지 않는가.  
        - 하위 요소:
            - 불법/위법/편법/유해행위(음주운전, 해킹, 차별 등) 여부
            - 개인정보/민감정보 요구 여부
            - 폭력·성인·혐오·위험행위 유도 여부
            - 잠재적 위험 표현 (“안 걸리는 법”, “우회 방법”) 포함 시 감점
        - 수치 가이드:
            - 0~5: 불법·유해·위험 유도
            - 6~12: 경계·모호함
            - 13~20: 중립적·일반적
            - 21~25: 안전·비논란적
        - 세부 수치 조정 지표: ⬇︎ url (참고) lang  
        - 조정 논리:
            - url 외부 민감/비신뢰 사이트 많음 → -1.0~-3.0  
            - lang 비정상 혼합(ko+en+특수문자 과다) → 생성 텍스트/맥락 불안정 → -1.0~-2.0  

        ---

        [출력 형식(JSON only)]
        {
        "scoreInfo": {
            "clarityScore": <0.00~25.00>,
            "specificityScore": <0.00~25.00>,
            "formatScore": <0.00~25.00>,
            "safetyScore": <0.00~25.00>
        }
        }
        주의: JSON 외 텍스트 출력 금지. 숫자는 소수 2자리. 근거는 간결하고 입력에 근거할 것.
        
        [예시 입력]
        "AI를 활용한 스마트팩토리의 장점을 3가지로 요약해서 표로 정리해줘."

        [예시 출력]
        {
            "scoreInfo": {
                "clarityScore": 22.20,
                "specificityScore": 19.10,
                "formatScore": 22.00,
                "safetyScore": 23.00
            }
        }

    """


import json
from datasets import load_dataset

DATA_PATH = "/home/j-k13a309/judge_prompt/train_dataset_clean.jsonl"  

raw_ds = load_dataset("json", data_files=DATA_PATH)["train"]



def format_example(example):
    user_input = example.get("question", "")
    
    # 메타헤더
    meta_header = build_meta_header(user_input)

    # user 메시지
    user_prompt = (
        f"[META]\n{meta_header}\n\n"
        f"[USER PROMPT]\n{user_input}\n"
    )

    # 정답 JSON (scoreInfo)
    score_info = example["labels"]["scoreInfo"]
    assistant_output = {
        "scoreInfo": {
            "clarityScore": float(score_info["clarityScore"]),
            "specificityScore": float(score_info["specificityScore"]),
            "formatScore": float(score_info["formatScore"]),
            "safetyScore": float(score_info["safetyScore"]),
        }
    }
    assistant_text = json.dumps(assistant_output, ensure_ascii=False)

    # 🔹 입력 텍스트: SYSTEM + USER + [ASSISTANT] 까지만
    input_text = (
        f"[SYSTEM]\n{SYSTEM_PROMPT}\n\n"
        f"[USER]\n{user_prompt}\n\n"
        f"[ASSISTANT]\n"
    )

    # 🔹 정답 텍스트: assistant JSON 부분만
    label_text = assistant_text + "\n"

    return {
        "input_text": input_text,
        "label_text": label_text,
    }



raw_ds = load_dataset("json", data_files=DATA_PATH)["train"]

formatted_ds = raw_ds.map(format_example)
formatted_ds = formatted_ds.remove_columns(
    [c for c in formatted_ds.column_names if c not in ("input_text", "label_text")]
)


from datasets import DatasetDict

# 9:1 비율로 train / eval 분리
ds = formatted_ds.train_test_split(test_size=0.1, seed=42)
ds = DatasetDict({"train": ds["train"], "validation": ds["test"]})

BASE_MODEL = "/home/j-k13a309/judge_prompt/models/qwen2.5-7b-instruct"

from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL,
    trust_remote_code=True,
    # tokenizer_file=os.path.join(BASE_MODEL, "tokenizer.json"),
    # merges_file=os.path.join(BASE_MODEL, "merges.txt"),
)


MAX_SEQ_LEN = 1024  # 필요하면 1024~2048 사이로 조절

if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
pad_id = tokenizer.pad_token_id

def tokenize_fn(examples):
    input_texts = examples["input_text"]
    label_texts = examples["label_text"]

    # 1) 입력 부분 토크나이즈
    inputs = tokenizer(
        input_texts,
        add_special_tokens=False,
        padding=False,
        truncation=False,
    )

    # 2) 정답(JSON) 부분 토크나이즈
    targets = tokenizer(
        label_texts,
        add_special_tokens=False,
        padding=False,
        truncation=False,
    )

    batch_input_ids = []
    batch_attention_mask = []
    batch_labels = []

    for inp_ids, tgt_ids in zip(inputs["input_ids"], targets["input_ids"]):
        # (0) 전체 길이 계산
        total_len = len(inp_ids) + len(tgt_ids)
    
        if total_len <= MAX_SEQ_LEN:
            # 그냥 다 붙여도 되는 케이스 (이전 로직과 동일)
            ids = inp_ids + tgt_ids
            labels = [-100] * len(inp_ids) + tgt_ids
        else:
            # ⚠ 길이가 너무 길어서 잘라야 하는 케이스
            # 1) 만약 target(JSON)이 혼자서도 MAX_SEQ_LEN을 넘는다면
            if len(tgt_ids) >= MAX_SEQ_LEN:
                # 가장 마지막 MAX_SEQ_LEN 토큰만 사용 (전부 label)
                tgt_trim = tgt_ids[-MAX_SEQ_LEN:]
                ids = tgt_trim
                labels = tgt_trim  # 전부 정답 토큰
            else:
                # 2) target은 전부 살리고, input은 "뒤에서부터" 일부만 살림
                keep_inp = MAX_SEQ_LEN - len(tgt_ids)
                # 입력에서 뒤쪽 keep_inp 토큰만 유지 (앞부분 SYSTEM 일부를 버림)
                inp_trim = inp_ids[-keep_inp:] if keep_inp > 0 else []
                ids = inp_trim + tgt_ids
                labels = [-100] * len(inp_trim) + tgt_ids

    # attention_mask: 토큰 있는 부분은 1
    attn = [1] * len(ids)

    # pad 처리
    pad_len = MAX_SEQ_LEN - len(ids)
    if pad_len > 0:
        ids += [pad_id] * pad_len
        attn += [0] * pad_len
        labels += [-100] * pad_len

    batch_input_ids.append(ids)
    batch_attention_mask.append(attn)
    batch_labels.append(labels)


    return {
        "input_ids": batch_input_ids,
        "attention_mask": batch_attention_mask,
        "labels": batch_labels,
    }


tokenized_ds = ds.map(
    tokenize_fn,
    batched=True,
    remove_columns=ds["train"].column_names,  # input_text, label_text 제거
)

sample = tokenized_ds["train"][0]
print(sum(1 for x in sample["labels"] if x != -100))

# 예상: dict_keys(['input_ids', 'attention_mask', 'labels'])

import torch
from transformers import TrainingArguments,default_data_collator, DataCollatorForLanguageModeling, AutoModelForCausalLM, BitsAndBytesConfig
from peft import LoraConfig, get_peft_model
from transformers import Trainer

OUTPUT_DIR = "./qwen2.5-7b-instruct-finetuned-meta"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,                 # 8bit 쓰고 싶으면 load_in_8bit=True
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
)

# 8bit 로드 + LoRA (QLoRA 스타일)
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
# model.gradient_checkpointing_enable()

# LoRA 설정 (필요하면 r/lora_alpha/lora_dropout 조정)
peft_config = LoraConfig(
    r=32,
    lora_alpha=16,
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",],  # Qwen 계열에서 자주 쓰는 타겟 모듈
)

model = get_peft_model(model, peft_config)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    per_device_train_batch_size=2,
    per_device_eval_batch_size=1,
    gradient_accumulation_steps=4,   # effective batch size = 2 × 4 = 8
    learning_rate=2e-4,
    num_train_epochs=5,              # ← 에폭을 3 → 5로 늘림
    logging_strategy="steps",         # 명시적으로 logging 전략 추가
    logging_steps=50,                 # 로그 찍히는 빈도 조정
    eval_strategy="steps",      # 검증도 steps 단위로 설정해둠
    eval_steps=500,                   # 예: 500 step마다 검증
    save_strategy="steps",
    save_steps=500,                   # 체크포인트 저장 빈도 조정
    save_total_limit=2,
    bf16=torch.cuda.is_available(),
    report_to="none",
    remove_unused_columns=False,
    # 추가:
    load_best_model_at_end=True,      # 검증 성능 기반으로 최고 모델 자동 로드
    metric_for_best_model="loss",     # 손실 기준으로 최고 모델 판단
    greater_is_better=False,          # 손실은 작을수록 좋음
)

data_collator = default_data_collator

print(tokenized_ds["train"][0].keys())

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_ds["train"],
    eval_dataset=tokenized_ds["validation"],
    data_collator=default_data_collator,
    tokenizer=tokenizer,

)


trainer.train()

trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print("✅ 파인튜닝 완료 & 저장:", OUTPUT_DIR)

