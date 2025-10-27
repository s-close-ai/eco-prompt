# app/services/judge/judge_service.py
from loguru import logger
from app.services.judge.model_loader import get_llama_model
from app.services.judge.tokenizer_config import extract_features
from app.schemas.response import JudgeModelOutput
import anyio, json
from app.services.judge.json_grammar import JUDGE_OBJECT_GRAMMAR
# 모델 호출
# 토크나이저 -> 자연어 메타 헤더 추출
# 메타 헤더 적용
# 프롬프트 입력
    # user_personal_prompt는 미사용
# 모델 추론



async def run_judge_model(user_input, user_personal_prompt):
    logger.debug("run_judge_model 실행")
    llm = await get_llama_model()

    feats = extract_features(user_input)
    logger.debug(f"[features] {feats}")

    # 초기 모델 성능 테스트 시 메타 헤더 미반영
    meta_header = (
        f"[META] quest={feats['quest']} listy={feats['listy']} "
        f"sent={feats['sent']} uniq={feats['uniq']} lang={feats['lang']}"
    )

    SYSTEM_PROMPT = """\
        당신은 사용자 '질의(prompt)'의 품질을 평가하는 심사 모델입니다.
        다음 4개 항목을 각각 0.00~25.00 범위의 연속형 점수(소수 2자리)로 채점하고, 항목별 근거(rationale)를 1~2문장으로 제시하세요.
        경계값(0.00, 12.50, 25.00) 남용 금지: 특별히 강한 근거가 있을 때만 사용하고, 그렇지 않으면 1.00~24.00 사이의 세밀한 값을 사용하세요.

        [평가 항목]
        - clarityScore (명확성): 질문의 목적/출력 기대가 분명한가?
        - specificityScore (구체성): 제약(형식, 길이, 대상, 조건, 데이터 등)이 구체적인가?
        - formatScore (형식 준수): 출력 형식/언어/톤/길이가 명시되었는가?
        - safetyScore (안전성): 유해/부정확/규범 위반 소지가 없는가?

        [채점 앵커]
        - clarity: (예) 매우 불명확 0~5 / 불명확 6~12 / 약간 명확 13~19 / 매우 명확 20~25
        - specificity: (예) 제약 없음 0~6 / 일부 제약 7~12 / 충분한 제약 13~19 / 매우 상세 20~25
        - format: (예) 형식 없음 0~6 / 일부 지시 7~14 / 명확한 지시 15~19 / 엄격한 템플릿 20~25
        - safety: (예) 위험한 요청 0~5 / 모호 6~14 / 일반적 15~19 / 안전하고 비논란적 20~25

        [가점/감점 규칙 예]
        - 질문에 '대상·목적·산출물 형식·제약'이 동시에 명시 → clarity/format 가점
        - '누구에게, 언제까지, 어떤 형식으로' 같은 구체 신호 → specificity 가점
        - 개인정보, 의료/법률 위험, 불법 유도 가능성 → safety 감점

        ---

        [평가 항목 및 세부 조정 기준]

        ### 1. Clarity (명확성)
        - **주요 지표:** ⬆︎ uniq ⬆︎ quest ⚙︎ sent ⬇︎ stopr ⬇︎ punct  
        - **조정 논리:**  
        - uniq ↑ → 단어 다양성 높아 표현 명확 → +0.5~2.0  
        - quest=1 → 질문 의도 분명 → +1.0~2.0  
        - sent: 2~10 → 적정 / 너무 적으면 불명확(-1.0~-2.0), 너무 많으면 산만(-1.0~-2.0)  
        - stopr ↑ → 군더더기 많음 → -0.5~-1.5  
        - punct ↑ → 문장 구조 혼란 → -0.5~-1.5  

        ### 2. Specificity (구체성)
        - **주요 지표:** ⬆︎ uniq ⬆︎ listy ⬆︎ url ⚙︎ tps ⬆︎ len_tok  
        - **조정 논리:**  
        - uniq ↑ → 구체 단어 사용 → +0.5~2.0  
        - listy=1 → 단계/조건 명시 → +1.0~2.0  
        - url 포함 → 근거 명시로 구체성 향상 → +0.5~1.5  
        - tps 5~20 → 이상적(무조정), 너무 낮으면(-1.0), 너무 높으면(-1.0)  
        - len_tok 너무 짧음 → 모호(-1.0~-2.0), 너무 김 → 불필요 세부로 노이즈(-1.0~-2.0)

        ### 3. Format Compliance (형식 준수)
        - **평가 목적:**  
            형식 준수란 단순히 “무엇을 하라”는 지시가 아니라,  
            **“어떤 형식으로, 어떤 구조로 답해야 하는지”**가 명확히 제시되어 있는지를 평가합니다.  
            즉, 답변의 **출력 형태·구성 방식·표현 형식·언어 규칙·제약 조건**이 명시된 정도를 본다.
            질문의 맥락에 따라 형식 준수의 중요성은 달라질 수 있다.
        - **주요 지표:** ⬆︎ listy ⚙︎ avglen ⚙︎ lang  
        - **조정 논리:**  
        - listy=1 → 단계별 지시문 가능성 ↑ → +1.0~2.0  
        - avglen 너무 짧음 → 지시 불충분(-1.0), 너무 김 → 혼란(-1.0)  
        - lang 혼합(ko+en 등) → 지시 불명확 가능성 → -1.0~-2.0  

        ### 4. Safety (안전성)
        - **주요 지표:** ⬇︎ url ⚙︎ lang  
        - **조정 논리:**  
        - url 외부 민감/비신뢰 사이트 많음 → -1.0~-3.0  
        - lang 비정상 혼합(ko+en+특수문자 과다) → 생성 텍스트/맥락 불안정 → -1.0~-2.0  

        ---

        [출력 형식(JSON only)]
        {
        "summary": "<한 줄 요약>",
        "scoreInfo": {
            "clarityScore": <0.00~25.00>,
            "clarityReason": "<이유 1~2문장>",
            "specificityScore": <0.00~25.00>,
            "specificityReason": "<이유 1~2문장>",
            "formatScore": <0.00~25.00>,
            "formatReason": "<이유 1~2문장>",
            "safetyScore": <0.00~25.00>,
            "safetyReason": "<이유 1~2문장>"
        }
        }
        주의: JSON 외 텍스트 출력 금지. 숫자는 소수 2자리. 근거는 간결하고 입력에 근거할 것.
    [예시 입력]
    - "GPT-4로 마케팅 아이디어 10개를 bullet로 한국어로 써줘. 각 아이디어는 20자 이내."
    [예시 출력]
    {
    "summary": "한국어 불릿 10개, 길이 제한 포함한 마케팅 아이디어 요청",
    "scoreInfo": {
        "clarityScore": 22.32,
        "clarityReason": "목적과 산출물(아이디어 10개)이 명확합니다.",
        "specificityScore": 21.87,
        "specificityReason": "언어, 개수, 길이 제한이 제시되어 구체적입니다.",
        "formatScore": 22.26,
        "formatReason": "불릿 형식과 한국어 지시가 분명합니다.",
        "safetyScore": 21.58,
        "safetyReason": "안전 이슈 없음."
    }
    }

    """

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"[META]\n{meta_header}\n\n"
        f"[USER PROMPT]\n{user_input}\n"
    )

    def _infer():
        return llm.create_chat_completion(
            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_input}
            ],
            max_tokens=1024,
            temperature=0.2,
            stream=False,
            # grammar=JUDGE_OBJECT_GRAMMAR,
        )

    result = await anyio.to_thread.run_sync(_infer)
    # out = llm(prompt)
    logger.success(f"[result]: {result}")

    text = (result["choices"][0]["message"]["content"] or "").strip()

    # start = text.find("{")
    # end = text.rfind("}")
    # if start == -1 or end == -1:
    #     logger.error(f"JSON not found in model output: {text!r}")
    #     raise ValueError("Judge output is not valid JSON.")

    # json_str = text[start:end+1]

    # try:
    #     j = json.loads(json_str)
    # except json.JSONDecodeError as e:
    #     logger.error(f"JSONDecodeError: {e}; raw={text!r}")
    #     raise

    try:
        j = json.loads(text)
    except json.JSONDecodeError:
        logger.error(f"JSONDecodeError: raw={text!r}")
        raise ValueError("Judge output is not valid JSON object.")

    info = j["scoreInfo"]

    clarity = float(info["clarityScore"])
    specificity = float(info["specificityScore"])
    format_ = float(info["formatScore"])
    safety = float(info["safetyScore"])
    total = round(clarity + specificity + format_ + safety, 2)

    return JudgeModelOutput(
        clarityScore=clarity,
        specificityScore=specificity,
        formatScore=format_,
        safetyScore=safety,
        overallScore=total,
        summary=j.get("summary", ""),
    )
    
