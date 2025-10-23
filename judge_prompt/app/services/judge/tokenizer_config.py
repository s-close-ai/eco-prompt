from __future__ import annotations
import re
from typing import List, Dict, Iterable
from kiwipiepy import Kiwi
from nltk.corpus import stopwords

_kiwi = Kiwi()

# 영어 불용어
EN_STOPWORDS: set(map(str.lower, stopwords.words("english")))

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
RE_LISTY   = re.compile(r"(?m)^\s*(?:-|\*|\d+\.|①|②|③|첫째|둘째|셋째|first|second|third)\s+",
                        re.IGNORECASE)
RE_QMARK   = re.compile(r"\?")
RE_Q_KO_TAIL = re.compile(r"(까\??$)|(나요\??$)|(니\??$)|(죠\??$)")
RE_Q_EN_LEAD = re.compile(
    r"\b(what|why|how|when|where|who|which|can|could|should|would|is|are|do|does|did)\b",
    re.IGNORECASE
)

# 문장 분리 / 토크나이즈
def split_sentences(text):
    # kiwi 문장 분리 사용
    sents = [s.text.strip() for s in _kiwi.split_into_sents(text)]
    # 줄바꿈/기호 분리 보강...?
    # if not sents:
        # sents = [s.strip() for s in re.split(r"[.?!\n]+", text) if s.strip()]
    # return sents

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
    ko = len(RE_HANGUL.findall(text))
    en = len(RE_LATIN.findall(text))
    if ko == 0 and en == 0:
        return "unknown"
    if ko > 0 and en == 0:
        return "ko"
    if en > 0 and ko == 0:
        return "en"
    ratio = ko / (ko + en)
    if 0.2 < ratio < 0.8:
        return "mix"
    return "ko" if ratio >= 0.8 else "en"

# 지표 함수
