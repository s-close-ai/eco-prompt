# FastAPI 환경 설정

1. uv 설치
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

2. 환경 설정하기
```
# 가상환경 설정
uv init --python 3.12
uv venv
source .venv/Scripts/activate

# 필수 라이브러리 설치
uv add fastapi vllm==0.10.2 matplotlib math-verify genism qdrant-client
```

