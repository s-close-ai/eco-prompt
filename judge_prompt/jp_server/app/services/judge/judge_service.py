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
    result = await request_judge_output(prompt)


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
        totalScore=total,
        summary=j.get("summary", ""),
    )
