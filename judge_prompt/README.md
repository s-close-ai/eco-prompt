# Judge Prompt

LLM 프롬프트(사용자 질의)의 **품질을 자동으로 평가하는 백엔드 서비스**입니다.  
사용자의 입력 텍스트를 받아 다음 네 가지 항목을 0~25점 스케일로 평가하고, 합산한 총점을 제공합니다.

- **Clarity**: 명확성
- **Specificity**: 구체성
- **Format**: 형식/구조 적절성
- **Safety**: 안전성

이 서비스는 두 개의 FastAPI 서버로 구성됩니다.

- **`model_server`**: GGUF 기반 LLM을 직접 로드·추론하는 모델 서버
- **`jp_server`**: 외부에서 호출하는 API 서버  
  - 질의 전처리 & 메타 피처 추출 (Kiwi, NLTK 기반)
  - 모델 서버 호출 및 점수 후처리

---

## Architecture

```text
[Client / Backend]
        |
        |  POST /prompt-judge (userInput)
        v
  ┌───────────────────┐
  │     jp_server     │
  │  - FastAPI        │
  │  - Worker Queue   │
  │  - Feature Extract│
  └────────┬──────────┘
           |
           |  HTTP (json: { prompt })
           v
  ┌───────────────────┐
  │   model_server    │
  │  - FastAPI        │
  │  - llama.cpp LLM  │
  │  - JSON Grammar   │
  └────────┬──────────┘
           |
           v
   JSON { summary, scoreInfo }
```
## 디렉토리 구조
<details>

<summary><strong>전체 디렉토리 구조 보기</strong></summary>

```text
judge_prompt/
├── jp_server/
│   ├── app/
│   │   ├── api/
│   │   │   └── inference.py
│   │   ├── core/
│   │   │   └── config.py
│   │   ├── schemas/
│   │   │   └── request.py
│   │   │   └── response.py
│   │   ├── services/
│   │   │   ├── infra/worker_pool.py
│   │   │   └── judge/
│   │   │       ├── llama_client.py
│   │   │       ├── judge_service.py
│   │   │       └── tokenizer_config.py
│   │   └── main.py
│   └── requirements_JP.txt
│
└── model_server/
    ├── app/
    │   ├── api/router.py
    │   ├── services/
    │   │   ├── model_loader.py
    │   │   ├── json_grammar.py
    │   │   └── judge_service.py
    │   └── main.py
    └── requirements.txt 

```
</details>