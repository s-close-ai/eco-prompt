# app/services/judge/judge_service.py
import anyio, json, re
from loguru import logger
from llama_cpp import  LlamaGrammar
# from app.services.judge.model_loader import get_llama_model
from app.services.judge.tokenizer_config import extract_features
from app.schemas.response import JudgeModelOutput
from app.services.judge.llama_client import request_judge_output
# 모델 호출
# 토크나이저 -> 자연어 메타 헤더 추출
# 메타 헤더 적용
# 프롬프트 입력
    # user_personal_prompt는 미사용
# 모델 추론


async def run_judge_model(user_input):
    logger.debug("run_judge_model 실행")
    # llm = await get_llama_model()

    feats = extract_features(user_input) or {}
    logger.debug(f"[features] {feats}")

    # 초기 모델 성능 테스트 시 메타 헤더 미반영
    meta_header = (
        f"[META] quest={feats.get('quest', 0)} listy={feats.get('listy', 0)} "
        f"sent={feats.get('sent', 0)} uniq={feats.get('uniq', 0)} lang={feats.get('lang', 'ko')}"
    )

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
        - 세부 수치 조정 지표: ⬆︎ uniq ⬆︎ quest ⚙︎ sent ⬇︎ stopr ⬇︎ punct  
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
            - 0~10: 불법·유해·위험 유도
            - 11~15: 경계·모호함
            - 16~20: 중립적·일반적
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
        "AI를 활용한 스마트팩토리의 장점을 3가지로 요약해서 표로 정리해줘."

        [예시 출력]
        {
            "summary": "AI 기반 스마트팩토리의 장점을 표 형식으로 3가지 요약 요청",
            "scoreInfo": {
                "clarityScore": 22.20,
                "clarityReason": "질문의 목적(스마트팩토리 장점 요약)과 출력 형식(표로 정리)이 명확하게 제시되어 있습니다.",
                "specificityScore": 19.10,
                "specificityReason": "요약 개수(3가지)와 형식(표)이 구체적으로 지정되어 있습니다. 하지만, 표에 들어가야할 세부 항목이 주어지지 않았습니다.",
                "formatScore": 22.00,
                "formatReason": "표 형식과 '요약'이라는 출력 지침이 분명합니다.",
                "safetyScore": 23.00,
                "safetyReason": "비논란적이며 안전한 정보 요청입니다."
            }
        }

    """


    prompt = (
        f"[META]\n{meta_header}\n\n"
        f"[USER PROMPT]\n{user_input}\n"
    )

    def _clamp2(x) -> float:
        # 숫자 보장 + 0~25, 소수 2자리
        try:
            v = float(x)
        except Exception:
            v = 0.0
        return round(max(0.0, min(25.0, v)), 2)

    # 서버 분리 후, grammar 전달 -> json_schema 그대로 전달해야됨
    result = await request_judge_output(SYSTEM_PROMPT, prompt)

    #  if not isinstance(result, dict) or "scoreInfo" not in result:
    #     # (레거시/예외) 만약 혹시 기존 OpenAI 호환 응답 형태가 들어온다면
    #     # choices[0].message.content 에서 JSON 추출 로직을 여기서 분기 처리해도 됨.
    #     logger.error(f"Unexpected judge response format: {result}")
    #     raise ValueError("Judge response format invalid")

    j = result
    info = j.get("scoreInfo", {})

    clarity = _clamp2(info.get("clarityScore"))
    specificity = _clamp2(info.get("specificityScore"))
    format_ = _clamp2(info.get("formatScore"))
    safety = _clamp2(info.get("safetyScore"))
    total = round(clarity + specificity + format_ + safety, 2)

    return JudgeModelOutput(
        clarityScore=clarity,
        specificityScore=specificity,
        formatScore=format_,
        safetyScore=safety,
        overallScore=total,
        summary=j.get("summary", ""),
    )
