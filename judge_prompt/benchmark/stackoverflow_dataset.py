from datasets import load_dataset
from bs4 import BeautifulSoup
import json, requests, time, os, random, re
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")
UPSTAGE_CHAT_URL = "https://api.upstage.ai/v1/chat/completions"
UPSTAGE_MODEL_NAME = os.getenv("UPSTAGE_MODEL_NAME")

dataset = load_dataset("pacovaldez/stackoverflow-questions", split="train", streaming=True)

# HTML 일반 텍스트 변환
def html_to_plain_text(html):
    return BeautifulSoup(html, "html.parser").get_text(separator="\n").strip()



SYSTEM_PROMPT = """\
        당신은 사용자 '질의(prompt)'의 품질을 평가하는 심사 모델입니다.

        userInput은 보통 영어로 주어집니다.
        1단계: userInput을 그대로 "question_orig" 필드에 복사합니다.
        2단계: userInput을 자연스러운 fluent Korean으로 번역하여 "question_ko" 필드에 작성합니다.
        3단계: 아래 4개 항목의 평가는 **반드시 question_ko(번역된 한국어 문장)** 의 품질을 기준으로만 수행합니다.
               원본 영어 표현의 문법/형식/명확성 등은 평가 기준에 포함하지 마세요.

        또한, 요약(summary) 역시 question_ko(한국어 번역문)를 기준으로 10자 이내로 작성합니다.

        번역된 question_ko에 대해 다음 4개 항목을 각각 0.00~25.00 범위의 연속형 점수(소수 2자리)로 채점하고,
        항목별 근거(rationale)를 1~2문장으로 제시하세요.
        경계값(0.00, 12.50, 25.00) 남용 금지: 특별히 강한 근거가 있을 때만 사용하고,
        그렇지 않으면 1.00~24.00 사이의 세밀한 값을 사용하세요.

        summary: 사용자의 채팅방 제목 선정을 위한 question_ko에 대한 10자 이내 한글 요약.
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
        
        ---

        [출력 형식(JSON only)]
        {
          "question_ko": "<userInput의 자연스러운 한국어 번역 결과>",
          "summary": "<question_ko 기반 userInput 10자 이내 요약 - 한국어>",
          "scoreInfo": {
              "clarityScore": <0.00~25.00>,
              "specificityScore": <0.00~25.00>,
              "formatScore": <0.00~25.00>,
              "safetyScore": <0.00~25.00>
          }
        }
        주의:
        - JSON 외 텍스트 출력 금지.
        - 숫자는 소수 2자리.
        - 모든 평가는 question_ko(한국어 번역문)를 기준으로 하라.
    """


def call_upstage(question: str, max_retries: int = 3, backoff: float = 2.0) -> dict:
    payload = {
        "model": UPSTAGE_MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question}
        ],
        "temperature": 0.0,
        "max_tokens": 1024,
        "response_format": {"type": "json_object"},
    }
    headers = {"Authorization": f"Bearer {API_KEY}"}

    for attempt in range(max_retries):
        try:
            res = requests.post(
                UPSTAGE_CHAT_URL,
                headers=headers,
                json=payload,
                timeout=30,
            )
            res.raise_for_status()
            data = res.json()
            print(f"[data]{data}")
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            wait = backoff * (attempt + 1) + random.uniform(0, 0.5)
            print(f"[WARN] 요청 실패 (시도 {attempt+1}/{max_retries}): {e} → {wait:.1f}s 대기")
            time.sleep(wait)

    raise RuntimeError(f"최대 재시도 {max_retries}회 초과")


output_path = "korquad_labeled_stream_with_source.jsonl"
with open(output_path, "a", encoding="utf-8") as f_out:
    for item in tqdm(dataset, desc="Processing SO questions"):
        body_html = item.get("body", "")
        userInput = html_to_plain_text(body_html)
        
        try:
            result = call_upstage(userInput)

            print(f"[result] {result}")
            record = {
                "id": str(item.get("id", idx)),   # id 없으면 순번으로 대체
                "question": result.get("question_ko", "").strip(),
                "labels": {
                    "summary": result.get("summary", ""),
                    "scoreInfo": result.get("scoreInfo", {})
                },
                "source": "stackoverflow"
            }

            f_out.write(json.dumps(record, ensure_ascii=False) + "\n")

        except Exception as e:
            print(f"[Error] {e}")