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
uv add fastapi vllm==0.10.2 langchain langchain-core langchain-community langchain-huggingface langchain-qdrant sentence-transformers

# 파인튜닝용 라이브러리 설치
uv add accelerate peft trl

# 모델 학습 트래킹을 위한 라이브러리 설치
uv add wandb

# 성능 평가를 위한 레포 클론 in tests
git clone https://github.com/EleutherAI/lm-evaluation-harness.git

cd lm-evaluation-harness

uv pip install -e .

# pdf 생성을 위한 라이브러리 설치
uv add reportlab
```



