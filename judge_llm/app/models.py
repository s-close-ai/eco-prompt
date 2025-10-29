# app/models.py  
from __future__ import annotations
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import os

# 가중치(합 100) — .env 오버라이드 지원
W_CORRECTNESS  = int(os.getenv("JUDGE_W_CORRECTNESS",  "45"))
W_COMPLETENESS = int(os.getenv("JUDGE_W_COMPLETENESS", "25"))
W_CLARITY      = int(os.getenv("JUDGE_W_CLARITY",      "15"))
W_PRACTICES    = int(os.getenv("JUDGE_W_PRACTICES",    "15"))

TEXT_LIMIT = int(os.getenv("JUDGE_TEXT_LIMIT", "220"))  # criteria/feedback 최대 길이

class Subscores(BaseModel):
    correctness: int = Field(ge=0, le=100)
    completeness: int = Field(ge=0, le=100)
    clarity: int = Field(ge=0, le=100)
    practices: int = Field(ge=0, le=100)

class JudgeNormalized(BaseModel):
    version: str = 'judge:v1'
    # 원본 모델 점수 (소수 허용 0~5)
    final_score: float = Field(ge=0, le=5)
    subscores: Optional[Subscores] = None

    # 설명 필드(잘라내기 포함)
    criteria: str
    feedback: str

    # 파생 필드
    total: int = Field(ge=0, le=100)     # 0~100 환산 총점
    recovered: bool = False              # 파싱/보정 개입 여부
    lang: Optional[str] = None           # ko/en 힌트(간단 추정)

def _clip_len(s: str, n: int) -> str:
    s = (s or "").strip()
    return s if len(s) <= n else s[:n]

def _to_float_0_5(v: Any, default: float = 3.0) -> float:
    """
    final_score를 0~5 float로 보정.
    - "3.5", 3.5, 4, "4/5", "7/10" 형태 허용.
    """
    try:
        if isinstance(v, str) and "/" in v:
            num, den = v.split("/", 1)
            f = float(num) / float(den) * 5.0
        else:
            f = float(v)
            # 일부 모델이 1~5로만 주는 경우 그대로 사용
        if f < 0 or f > 5:
            return default
        return f
    except Exception:
        return default

def _clamp01(x, lo=0, hi=100):
    try:
        v = int(round(float(x)))
    except Exception:
        return None
    return max(lo, min(hi, v))

def calc_total(final_score_0_5: float, subs: Optional[Dict]) -> int:
    if isinstance(subs, dict):
        c1 = _clamp01(subs.get("correctness"))
        c2 = _clamp01(subs.get("completeness"))
        c3 = _clamp01(subs.get("clarity"))
        c4 = _clamp01(subs.get("practices"))
        if None not in (c1, c2, c3, c4):
            return int((c1*W_CORRECTNESS + c2*W_COMPLETENESS + c3*W_CLARITY + c4*W_PRACTICES) // 100)
    # subscores 부재/부실: final_score 기준 환산
    return int(round((final_score_0_5 / 5.0) * 100))

def normalize_judge_json(raw: Dict[str, Any]) -> JudgeNormalized:
    """
    모델 JSON(raw)을 내부 표준 포맷으로 변환/보정.
    - final_score: float 0~5로 정규화(소수, 분수 문자열 허용)
    - subscores: 일부 누락 시 전체 무시하고 final_score 환산 사용
    - criteria/feedback: 길이 제한
    """
    recovered = False

    fs = _to_float_0_5(raw.get("final_score"), default=3.0)
    if fs == 3.0 and raw.get("final_score") is None:
        recovered = True

    subs_in = raw.get("subscores")
    subs_model = None
    if isinstance(subs_in, dict):
        c1 = _clamp01(subs_in.get("correctness"))
        c2 = _clamp01(subs_in.get("completeness"))
        c3 = _clamp01(subs_in.get("clarity"))
        c4 = _clamp01(subs_in.get("practices"))
        if None not in (c1, c2, c3, c4):
            subs_model = Subscores(correctness=c1, completeness=c2, clarity=c3, practices=c4)
        else:
            recovered = True

    criteria = _clip_len(str(raw.get("criteria", "")).strip(), TEXT_LIMIT)
    feedback = _clip_len(str(raw.get("feedback", "")).strip(), TEXT_LIMIT)

    total = calc_total(fs, subs_in if subs_model else None)

    # 언어 힌트(간단 추정)
    txt = f"{criteria} {feedback}"
    lang = "ko" if any("가" <= ch <= "힣" for ch in txt) else "en"

    return JudgeNormalized(
        version="judge:v1",
        final_score=fs,
        subscores=subs_model,
        criteria=criteria,
        feedback=feedback,
        total=total,
        recovered=recovered,
        lang=lang,
    )
