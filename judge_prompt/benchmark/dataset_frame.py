import json, os, time, random, requests
from datasets import load_dataset
from tqdm import tqdm
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.getenv("API_KEY")
UPSTAGE_CHAT_URL = "https://api.upstage.ai/v1/chat/completions"
UPSTAGE_MODEL_NAME = os.getenv("UPSTAGE_MODEL_NAME")

OUTPUT_PATH = "korquad_labeled_stream.jsonl"


SYSTEM_PROMPT = """\
        당신은 사용자 '질의(prompt)'의 품질을 평가하는 심사 모델입니다.
        다음 4개 항목을 각각 0.00~25.00 범위의 연속형 점수(소수 2자리)로 채점하고, 항목별 근거(rationale)를 1~2문장으로 제시하세요.
        경계값(0.00, 12.50, 25.00) 남용 금지: 특별히 강한 근거가 있을 때만 사용하고, 그렇지 않으면 1.00~24.00 사이의 세밀한 값을 사용하세요.

        summary: 사용자의 채팅방 제목 선정을 위한 userInput에 대한 10자 이내 한글 요약.
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
            - lang 혼합(ko+en 등) → 지시 불명확 가능성 → -1.0~-2.0  

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
        "summary": "<userInput 10자 이내 요약 - 한국어>",
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
            "summary": "AI 기반 스마트팩토리의 장점을 표 형식으로 3가지 요약 요청",
            "scoreInfo": {
                "clarityScore": 22.20,
                "specificityScore": 19.10,
                "formatScore": 22.00,
                "safetyScore": 23.00
            }
        }

    """

# 이미 처리 완료된 ID 로드
done_ids = set()
if os.path.exists(OUTPUT_PATH):
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                done_ids.add(data["id"])
            except:
                continue
print(f"[INFO] 이미 처리된 데이터 개수: {len(done_ids)}")

# KorQuAD 스트리밍 로드
ds = load_dataset("LGCNS/KorQuAD_2.0", streaming=True)

def call_upstage(question, max_retries=3, backoff=2.0):
    payload = {
        "model": UPSTAGE_MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question}
        ],
        "temperature": 0.0,
        "max_tokens": 512,
    }
    headers = {"Authorization": f"Bearer {API_KEY}"}

    for attempt in range(max_retries):
        try:
            res = requests.post(UPSTAGE_CHAT_URL, headers=headers, json=payload, timeout=30)
            res.raise_for_status()
            raw = res.json()["choices"][0]["message"]["content"]
            return json.loads(raw) if isinstance(raw, str) else raw
        except Exception as e:
            wait = backoff * (attempt + 1) + random.uniform(0, 0.5)
            print(f"[WARN] 요청 실패 (시도 {attempt+1}/{max_retries}): {e} → {wait:.1f}s 대기")
            time.sleep(wait)
    raise RuntimeError(f"최대 재시도 {max_retries}회 초과")

# 이어서 라벨링
with open(OUTPUT_PATH, "a", encoding="utf-8") as fout:
    for sample in tqdm(ds["train"], desc="라벨링 진행 중", unit="문항"):
        qid = sample["id"]
        question = sample["question"]

        if qid in done_ids:
            continue  # 이미 처리됨

        try:
            labels = call_upstage(question)
        except Exception as e:
            print(f"[ERROR] {qid}: {e}")
            continue

        fout.write(json.dumps({"id": qid, "question": question, "labels": labels}, ensure_ascii=False) + "\n")
        fout.flush()
        time.sleep(0.3)
