# app/services/judge/judge_service.py
import json, nltk
from loguru import logger
from app.services.judge.model_loader
from app.services.judge.tokenizer_config import (
    PUNCT_RE, SENT_SPLIT_RE, URL_RE, LISTY_RE, QUESTION_RE,
    HANGUL_RE, ASCII_RE, TOKEN_RE, KO_STOPWORDS, EN_STOPWORDS
)

# 모델 호출
# 토크나이저 -> 자연어 메타 헤더 추출
# 메타 헤더 적용
# 프롬프트 입력
    # user_personal_prompt는 미사용
# 모델 추론

def _tokenize(text: str):
    return _TOKEN_RE.findall(text)

def _split_sentences(text: str):
    return [s.strip() for s in _SENT_SPLIT_RE.split(text) if s.strip()]

def _lang_detect(text: str) -> str:
    ko = len(_HANGUL_RE.findall(text))
    en = len(_ASCII_RE.findall(text))
    if ko > 0 and en == 0:
        return "ko"
    if en > 0 and ko == 0:
        return "en"
    if ko == 0 and en == 0:
        return "unknown"
    return "mix"

def _stop_ratio(tokens: list[str]) -> float:
    if not tokens:
        return 0.0
    lower = [t.lower() for t in tokens]
    ko_cnt = sum(1 for t in lower if t in _KO_STOPWORDS)
    en_cnt = sum(1 for t in lower if t in _EN_STOPWORDS)
    return round((ko_cnt + en_cnt) / len(tokens), 4)

def _punct_ratio(tokens: list[str]) -> float:
    if not tokens:
        return 0.0
    punct_cnt = sum(1 for t in tokens if _PUNCT_RE.search(t))
    return round(punct_cnt / len(tokens), 4)


async def run_judge_model(user_input, user_personal_prompt):
    llm = await get_llama_model()
