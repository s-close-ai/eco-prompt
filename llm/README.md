# FastAPI 환경 설정

1. uv 설치
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. 환경 설정하기
```
# 가상환경 설정
uv init --python 3.12.3
uv venv
source .venv/Scripts/activate

# 필수 라이브러리 설치
uv add fastapi vllm==0.10.2 matplotlib math-verify genism qdrant-client
```

## 모델 파인튜닝

1. `app/services/model_download.py`에 원하는 모델 입력해서 모델을 다운 받는다.
2. `training/sft_lora_fine_tuning.py`을 통해 SFT + LoRA 파인튜닝을 실행한다.