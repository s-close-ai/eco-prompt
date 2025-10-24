# app/services/judge/judge_service.py
from loguru import logger
from app.services.judge.model_loader import get_llama_model
from app.services.judge.tokenizer_config import extract_features

# 모델 호출
# 토크나이저 -> 자연어 메타 헤더 추출
# 메타 헤더 적용
# 프롬프트 입력
    # user_personal_prompt는 미사용
# 모델 추론



async def run_judge_model(user_input, user_personal_prompt):
    llm = await get_llama_model()

    feats = extract_features(user_input)
    logger.debug(f"[features] {feats}")

    # 초기 모델 성능 테스트 시 메타 헤더 미반영
    # meta_header = (
    #     f"[META] quest={feats['quest']} listy={feats['listy']} "
    #     f"sent={feats['sent']} uniq={feats['uniq']} lang={feats['lang']}"
    # )
    SYSTEM_PROMPT = """\
    당신은 사용자 질의(prompt)의 품질을 평가하는 심사 모델입니다.
    다음 항목별로 0~25점 사이에서 점수를 부여하세요.
    - clarityScore (명확성): 질문의 의도와 목표가 얼마나 분명한가
    - specificityScore (구체성): 필요한 정보, 조건, 제약이 구체적으로 제시되었는가
    - formatScore (형식 준수): 출력 형식, 언어, 길이 등 지시가 명확하고 올바른가
    - safetyScore (안전성): 부적절하거나 위험한 내용이 없는가

    총점(score)은 네 항목 점수의 합(0~100점)입니다.
    각 항목은 반드시 0~25점 사이로 정수 또는 소수점 1자리까지 부여하세요.

    출력 형식은 반드시 아래 JSON 형태로만 반환하세요:
    {
    "summary": "<한 줄 요약>",
    "scoreInfo": {
        "score": <총합>,
        "clarityScore": <값>,
        "specificityScore": <값>,
        "formatScore": <값>,
        "safetyScore": <값>
        }
    }
    """

    prompt = (
        f"{SYSTEM_PROMPT}\n\n"
        f"[META]\n{meta_header}\n\n"
        f"[USER PROMPT]\n{user_input}\n"
    )

    out = llm(prompt)
    return out
