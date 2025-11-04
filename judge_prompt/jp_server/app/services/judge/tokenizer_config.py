from __future__ import annotations
import re
from typing import List, Dict, Iterable
from kiwipiepy import Kiwi
from nltk.corpus import stopwords
from loguru import logger

_kiwi = Kiwi()

# 영어 불용어
EN_STOPWORDS = set(map(str.lower, stopwords.words("english")))

# 한국어 불용어 -> 불용어 사전 업데이트..?
KO_STOPWORDS: set[str] = {
    "은","는","이","가","을","를","에","에서","에게","으로","로",
    "와","과","도","만","및","그","이것","그것","저것",
    "하다","그리고","또","하지만","처럼","으로써","까지","부터"
}

# 정규식 패턴
RE_URL     = re.compile(r"https?://[^\s]+")
RE_LATIN   = re.compile(r"[A-Za-z]")
RE_HANGUL  = re.compile(r"[가-힣]")
RE_PUNCT   = re.compile(r"[^\w\s가-힣A-Za-z]")   # 한/영/숫자/공백 제외 기호

'''
아래와 같이 줄바꿈을 포함하는 순서 정렬은 카운트하지만
1.
2. 
3. 
한 문장 내의 1. 2. 3. 형식으로 지정된 것은 파악 못함
-> RE_LISTY_INLINE 추가 지정
'''
RE_LISTY_INLINE = re.compile(r"(?:\d+\.\s*[\w가-힣]+)(?:\s*(?:,|;)?\s*\d+\.\s*[\w가-힣]+)+")
RE_LISTY_MULTI = re.compile(r"(?m)^\s*(?:-|\*|\d+\.|①|②|③|첫째|둘째|셋째|first|second|third)\s+", re.IGNORECASE)
RE_QMARK   = re.compile(r"\?")
RE_Q_KO_TAIL = re.compile(r"(까\??$)|(나요\??$)|(니\??$)|(죠\??$)")
RE_Q_EN_LEAD = re.compile(
    r"\b(what|why|how|when|where|who|which|can|could|should|would|is|are|do|does|did)\b",
    re.IGNORECASE
)

# 문장 분리 / 토크나이즈
def split_sentences(text):
    logger.debug("split_sentences 실행")
    # kiwi 문장 분리 사용
    sents = [s.text.strip() for s in _kiwi.split_into_sents(text)]
    # 줄바꿈/기호 분리 보강...?
    # if not sents:
        # sents = [s.strip() for s in re.split(r"[.?!\n]+", text) if s.strip()]
    return sents

def tokenize_ko(text):
    tokens: List[str] = []
    for s in split_sentences(text):
        tokens.extend([t.form for t in _kiwi.tokenize(s)])
    return tokens

# 영어 토크나이저.....?
RE_EN_TOKEN = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+")
def tokenize_en(text: str) -> List[str]:
    return [m.group(0).lower() for m in RE_EN_TOKEN.finditer(text)]

# 언어 추정
def detect_lang(text: str) -> str:
    logger.debug("detect_lang 실행")
    ko = len(RE_HANGUL.findall(text))
    en = len(RE_LATIN.findall(text))
    logger.debug("정규식 패턴 적용")
    if ko == 0 and en == 0:
        return "unknown"
    if ko > 0 and en == 0:
        return "ko"
    if en > 0 and ko == 0:
        return "en"
    ratio = ko / (ko + en)
    logger.debug(f"한글 비율: {ratio}")
    if 0.2 < ratio < 0.8:
        return "mix"
    return "ko" if ratio >= 0.8 else "en"

# 지표 함수
def _stopword_ratio(tokens: Iterable[str], stopset: set[str]) -> float:
    tokens = list(tokens)
    if not tokens:
        return 0.0
    sw = sum(1 for t in tokens if t.lower() in stopset)
    return sw / len(tokens)

def _punct_ratio(text: str) -> float:
    if not text:
        return 0.0
    puncts = RE_PUNCT.findall(text)
    return len(puncts) / max(len(text), 1)

def _is_question(text: str, lang: str) -> int:
    # 1) 물음표
    if RE_QMARK.search(text):
        return 1
    # 2) 언어별 패턴
    for s in split_sentences(text):
        if lang in ("ko", "mix"):
            tail = s[-10:] if len(s) > 10 else s
            if RE_Q_KO_TAIL.search(tail):
                return 1
        if lang in ("en", "mix"):
            head = s[:40].lower()
            if RE_Q_EN_LEAD.search(head):
                return 1
    return 0

def _has_listy(text: str) -> int:
    # 1) 줄 시작 기준 bullet 리스트
    if RE_LISTY_MULTI.search(text):
        return 1
    # 2) 문장 내 연속 숫자 리스트
    if RE_LISTY_INLINE.search(text):
        return 1
    return 0

def _count_urls(text: str) -> int:
    return len(RE_URL.findall(text))

# 피처 추출
def extract_features(text: str) -> Dict[str, float | int | str]:
    logger.debug("extract_features 실행")
    lang = detect_lang(text)
    logger.debug(f"lang: {lang}")
    # 토큰화: 언어 기준으로 선택
    if lang == "ko":
        tokens = tokenize_ko(text)
        stopset = KO_STOPWORDS
    elif lang == "en":
        tokens = tokenize_en(text)
        stopset = EN_STOPWORDS
    else:  # mix/unknown → 두 쪽 모두 고려
        # 한국어/영어 토큰 합치되 중복 방지 X (의도: 실제 길이·비율 반영)
        tokens = tokenize_ko(text) + tokenize_en(text)
        stopset = KO_STOPWORDS | EN_STOPWORDS

    sents = split_sentences(text)
    n_tok = len(tokens)
    n_sent = len(sents)
    logger.debug(f"토큰, 문장수: {n_tok}, {n_sent}")
    uniq  = (len(set(t.lower() for t in tokens)) / n_tok) if n_tok else 0.0
    avglen = (n_tok / n_sent) if n_sent else 0.0
    tps    = avglen
    stopr  = _stopword_ratio(tokens, stopset)
    punct  = _punct_ratio(text)
    quest  = _is_question(text, lang)
    url    = _count_urls(text)
    listy  = _has_listy(text)

    return {
        "uniq": round(uniq, 4),
        "avglen": round(avglen, 2),
        "tps": round(tps, 2),
        "len_tok": n_tok,
        "sent": n_sent,
        "stopr": round(stopr, 4),
        "punct": round(punct, 4),
        "quest": int(quest),
        "url": int(url),
        "listy": int(listy),
        "lang": lang,
    }
