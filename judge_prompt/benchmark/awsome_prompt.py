from datasets import load_dataset
from bs4 import BeautifulSoup
import json, requests, time, os, random, re
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()
API_KEY=os.getenv("API_KEY")
UPSTAGE_CHAT_URL = "https://api.upstage.ai/v1/chat/completions"
UPSTAGE_MODEL_NAME = os.getenv("UPSTAGE_MODEL_NAME")

dataset = load_dataset("fka/awesome-chatgpt-prompts", split="train", streaming=True)
# print(f"[dataset] {dataset}")

SYSTEM_PROMPT = """\
        당신은 사용자 '질의(prompt)'의 품질을 평가하는 심사 모델입니다.

        userInput은 영어로 주어집니다.

        [점수 분포에 대한 매우 중요한 규칙]

        - 각 score(clarity, specificity, format, safety)는 0.00~25.00 사이의 **연속형 숫자**여야 한다.
        - **반드시 소수점 둘째 자리까지** 표기하되, 아래 패턴에만 머무르지 마라:
            - x.00, x.25, x.50, x.75 와 같이 0.25 간격으로만 점수를 주지 말 것.
            - 특히 0.00, 12.50, 25.00 세 값은 아주 특별한 경우에만 사용하고, 가능한 한 피할 것.
        - 점수를 정할 때는 다음 절차를 따르라:
            1) 먼저 0~100 사이의 정수 점수를 마음속으로 정한다.
               - 예: 67, 41, 83 처럼 다양한 값을 사용하고, 0, 25, 50, 75, 100 같은 단순 값은 피한다.
            2) 그 값을 4로 나누어 0.00~25.00 범위의 실수로 변환한다.
               - 예: 67 → 16.75, 41 → 10.25, 83 → 20.75
            3) 마지막 소수 둘째 자리는 0.01~0.09 사이에서 자연스럽게 조정해,
               - 예: 16.75 → 16.73, 10.25 → 10.28, 20.75 → 20.71 처럼
               - 이렇게 해서 16.73, 10.28, 20.71 같이 **다양한 소수 둘째 자리**가 나타나도록 한다.
        - 즉, 3.17, 8.42, 13.59, 19.83 처럼 **임의의 두 자리 소수**를 적극적으로 사용하라.
        - 네 항목의 점수는 서로 독립적으로 위 절차를 따를 수 있고, 항상 동일한 패턴(.00/.25/.50/.75)으로 끝나지 않아야 한다.

        1단계: userInput을 가능한 한 원문 의미를 유지하면서 **직역에 가깝게** 한국어로 번역해.
            단, 어미만 자연스러운 반말체로 바꿔라.
            - 예: "~하려고 합니다." → "~하려고 해"
            - 예: "~할 수 있습니까?" → "~할 수 있어?"
            - 예: "~에 대해 알고 싶습니다." → "~에 대해 알고 싶어"
            - 예: "~을 원합니다." → "~을 원해"
            - 예: "~해주세요." → "~해줘"

        2단계: 번역된 문장을 question_ko 필드에 넣고, 그 문장을 기준으로 평가를 진행해.
            - 모든 평가(clarity, specificity, format, safety)는 question_ko의 표현을 기준으로 해.
            - 영어 원문(userInput)은 평가 기준에 포함하지 마.

        또한, 요약(summary) 역시 question_ko(한국어 번역문)를 기준으로 10자 이내로 작성해.

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
            - 출력 예시 지정 ("이런식으로", "이런 형태로)
            - 단계적 구조 요구 (“1단계, 2단계로 설명”)
            - 언어/톤 제시 (“한국어로”, “공식적 어조로”)
            - 과도한 혼합 언어는 감점
        - 수치 가이드:
            - 0~5: 형식 지시 없음
            - 6~12: 일부 표현 (“정리해줘”)만 있음
            - 13~20: 명시된 형식 혹은 출력 예시 존재 (“표로”, “코드로”)
            - 21~25: 복수 형식·구조·톤 구체적 명시
        
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


def call_upstage(question: str, max_retries: int = 3, backoff: float = 2.0):
    payload = {
        "model": UPSTAGE_MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question}
        ],
        "temperature": 0.2,
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
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        
        except Exception as e:
            wait = backoff * (attempt + 1) + random.uniform(0, 0.5)
            print(f"[WARN] 요청 실패 (시도 {attempt+1}/{max_retries}): {e} → {wait:.1f}s 대기")
            time.sleep(wait)
        
    raise RuntimeError(f"최대 재시도 {max_retries}회 초과")

output_path = "re_ap_labeled_stream_with_source.jsonl"
processed_ids = set()

if os.path.exists(output_path):
    with open(output_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
                if obj.get("source") == "awesomeprompt":
                    processed_ids.add(obj.get("id"))
            except Exception:
                continue


with open(output_path, "a", encoding="utf-8") as f_out:
    for idx, item in tqdm(enumerate(dataset), desc="Processing AP questions", unit="q"):
        sample_id = f"ap_{idx}"

        if sample_id in processed_ids:
            continue
        
        # print(f"[item]{item}")
        userInput = item.get("prompt", "")
        try:
            result = call_upstage(userInput)
        except Exception as e:
            print(f"[Error] {sample_id}: {e}")
            continue
        # print(f"[result] {result}")
        record = {
            "id": sample_id,
            "question": result.get("question_ko","").strip(),
            "labels": {
                "summary": result.get("summary", ""),
                "scoreInfo": result.get("scoreInfo", {})
            },
            "source": "awesomeprompt"
        }

        f_out.write(json.dumps(record, ensure_ascii=False) + "\n")
        f_out.flush()
