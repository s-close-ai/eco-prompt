# Main LLM

- ecoprompt Main LLM

## 프로젝트 구조

```
[api]    →  [schemas]   →  [services]   →  [core / model]
엔드포인트    데이터검증      비즈니스 로직      환경설정 / 추론

llm/
├── app/                                    # 메인 애플리케이션 패키지
│   ├── api/                                # API 엔드포인트
│   │   ├── __init__.py
│   │   └── v1/                             # API v1 버전
│   │       ├── endpoints/                  # API 엔드포인트 구현
│   │       │   ├── __init__.py
│   │       │   ├── chat.py                 # 채팅 엔드포인트
│   │       │   └── train.py                # 학습 엔드포인트
│   │       │
│   │       ├── __init__.py
│   │       └── routers.py                  # 라우팅
│   │
│   ├── core/                               # 설정, 보안, 유틸성 모듈
│   │   ├── __init__.py
│   │   ├── config.py                       # 환경 변수 로드, 전역 설정
│   │   └── concurrency.py                  # 동시 요청 관련
│   │
│   ├── models/                             # AI 모델 관련
│   │   ├── __init__.py
│   │   ├── llm_loader.py                   # 메인 LLM 로드 관련
│   │   ├── mongodb_loader.py               # MongoDB 로드 관련
│   │   ├── prompt_template.py              # 시스템 프롬프트 관련
│   │   └── vectordb_loader.py              # vectorDB 로드 관련련
│   │
│   ├── schemas/                            # Pydantic 스키마 모음
│   │   ├── __init__.py
│   │   ├── chat.py  
│   │   └── train.py                       
│   │                
│   └── services/                           # 비즈니스 로직, 모델 추론 로직
│       ├── __init__.py
│       ├── chat.py                         # 채팅 관련 로직
│       ├── dpo_train.py                    # 재학습 관련 로직
│       ├── evaluate.py                     # 재학습 완료 모델 평가 로직
│       ├── model_download.py               # 모델 다운로드
│       ├── load_dpo_datasets.py            # 재학습 데이터 로드
│       ├── routing.py                      # 라우팅 관련 로직
│       ├── pdf_style.py                    # pdf 스타일 정의 코드
│       ├── pdf_tools.py                    # tool calling 관련 로직
│       └── use_mongodb.py                  # 사용자 채팅 기록 관련 로직
│
├── local-models/                           # 사용할 모델
│   ├── Llama-SSAFY-8B/                     # 실제 서비스에 사용될 모델
│   │   ├── qwen/                           # 코딩 특화 모델
│   │   └── midm/                           # KT 한국어 특화 모델
│   │
│   └── dpo_train/                          # 재학습 모델 저장 디렉토리
│
├── data/                                   # 학습에 사용할 데이터 
│   └── code_data/                          # 코딩 파인튜닝 관련 - 
│
├── training/                               # LLM 학습 관련
│   └── fine_tuning.py
│
├── tests/                                  # 테스트 코드
│   └── test_inference.py                   # LLM 추론 테스트
│ 
├── main.py                                 # FastAPI 애플리케이션 엔트리포인트
├── Dockerfile
├── .python-version                                
├── pyproject.toml                          # Python 의존성 패키지
├── env.example                             # 환경 변수 설정 예시
├── requirements.txt                        # 필요한 라이브러리
├── uv.lock                                 # uv를 통한 라이브러리 락
└── README.md                               # 프로젝트 문서
```


## FastAPI 환경 설정

1. uv 설치
```
curl -LsSf https://astral.sh/uv/install.sh | sh

# bash의 경우
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# zsh의 경우
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# 설치 확인
uv --version
```

2. 가상 환경 설정하기
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

# 성능 평가를 위한 레포 클론 in tests/
git clone https://github.com/EleutherAI/lm-evaluation-harness.git

cd lm-evaluation-harness

uv pip install -e .

# 사용자 채팅 기록 조회를 위한 mongodb 관련 라이브러리 설치
uv add pymongo dnspython

# pdf 생성을 위한 라이브러리 설치
uv add reportlab boto3

# 글꼴 설치
sudo apt-get install fonts-nanum fonts-nanum-coding
```

## 원하는 모델 설치

- Huggingface에서 원하는 모델을 찾아 app/services/model_download.py를 통해 설치한다.

## 학습 과정 트래킹

- wandb login 후, API_KEY 설정

## 프로젝트 시작

```
uvicorn main:app --host 0.0.0.0 --port 원하는_포트_번호
```

