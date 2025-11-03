# model_server/app/services/judge_service.py
import anyio, json, re
from loguru import logger
from llama_cpp import  LlamaGrammar
from app.services.model_loader import get_llama_model
from app.services.json_grammar import JUDGE_JSON_SCHEMA

# 모델 호출
# 토크나이저 -> 자연어 메타 헤더 추출
# 메타 헤더 적용
# 프롬프트 입력
    # user_personal_prompt는 미사용
# 모델 추론

# 동시 추론 상한 (Metal/UMA 안전옵션: 1, 여유되면 2까지 시도)
_INFER_LIMITER = anyio.Semaphore(1)
# 요청 타임아웃(초)
_INFER_TIMEOUT = 30.0

grammar = LlamaGrammar.from_json_schema(json.dumps(JUDGE_JSON_SCHEMA))

def _clamp25(x) -> float:
    """숫자 보장 + 0~25, 소수 2자리"""
    try:
        v = float(x)
    except Exception:
        v = 0.0
    return round(max(0.0, min(25.0, v)), 2)

async def run_judge_model(systemprompt, prompt):
    logger.debug("[run_judge_model] start")

    llm = await get_llama_model()
    
    # llm 호출
    try: 
        async with _INFER_LIMITER:
            with anyio.fail_after(_INFER_TIMEOUT):
                logger.info("모델 추론 시작")
                result = await anyio.to_thread.run_sync(
                    lambda: llm.create_chat_completion(
                        messages = [
                            {"role": "system", "content": systemprompt},
                            {"role": "user", "content": prompt},
                        ],
                        temperature=0.2,
                        top_p=0.9,
                        max_tokens=512,
                        grammar=grammar,
                    ),
                    cancellable=True,
                )
    except TimeoutError:
        logger.warning("[run_judge_model] inference timeout")
        raise ValueError("Inference timeout")
    except Exception as e:
        logger.exception(f"[run_judge_model] 추론 에러: {e}")
        raise
    
    # 응답 파싱
    try:
        content = result["choices"][0]["message"]["content"]
        data = json.loads(content)
    except Exception as e :
        logger.error(f"[run_judge_model] JSON parsing error: {e}")
        raise ValueError("Model did not return valid JSON")
    
    info = data.get("scoreInfo",{})

    return {
        "summary": data.get("summary", ""),
        "scoreInfo": {
            "clarityScore": _clamp25(info.get("clarityScore")),
            "specificityScore": _clamp25(info.get("specificityScore")),
            "formatScore": _clamp25(info.get("formatScore")),
            "safetyScore": _clamp25(info.get("safetyScore")),
        },

    }
    
