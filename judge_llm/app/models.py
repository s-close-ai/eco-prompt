# app/models.py  
from __future__ import annotations
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
import re, math, os

# 가중치(합 100) — .env 오버라이드 지원
W_CORRECTNESS  = int(os.getenv("JUDGE_W_CORRECTNESS",  "45"))
W_COMPLETENESS = int(os.getenv("JUDGE_W_COMPLETENESS", "25"))
W_CLARITY      = int(os.getenv("JUDGE_W_CLARITY",      "15"))
W_PRACTICES    = int(os.getenv("JUDGE_W_PRACTICES",    "15"))

# criteria/feedback 최대 길이 (JUDGE_FEEDBACK_MAXLEN 우선, 없으면 JUDGE_TEXT_LIMIT)
TEXT_LIMIT = int(os.getenv("JUDGE_FEEDBACK_MAXLEN", os.getenv("JUDGE_TEXT_LIMIT", "220")))

class Subscores(BaseModel):
    correctness: int = Field(ge=0, le=100)
    completeness: int = Field(ge=0, le=100)
    clarity: int = Field(ge=0, le=100)
    practices: int = Field(ge=0, le=100)

class JudgeNormalized(BaseModel):
    version: str = "judge:v1"
    # 원본 모델 점수 (소수 허용 0~5)
    final_score: float = Field(ge=0, le=5)
    subscores: Optional[Subscores] = None

    # 설명 필드(잘라내기 포함)
    criteria: str
    feedback: str

    # 파생 필드
    total: int = Field(ge=0, le=100)   # 0~100 환산 총점
    recovered: bool = False            # 파싱/보정 개입 여부
    lang: Optional[str] = None         # ko/en 힌트(간단 추정)

_RE_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.I)
_RE_HANGUL = re.compile(r"[가-힣]")

def _strip_code_fences(s: str) -> Tuple[str, bool]:
    """ ```json ... ``` 또는 ``` ... ``` 제거 """
    if not isinstance(s, str):
        return "", True
    m = _RE_FENCE.search(s)
    if m:
        return m.group(1), True
    return s, False

def _clip_len(s: str, n: int) -> Tuple[str, bool]:
    s = (s or "").strip()
    if len(s) <= n:
        return s, False
    return s[:n], True

def _clamp01(x, lo=0, hi=100) -> Optional[int]:
    try:
        v = int(round(float(x)))
    except Exception:
        return None
    return max(lo, min(hi, v))

def _coerce_subscores(subs_in: Any) -> Tuple[Optional[Subscores], bool]:
    """subscores dict를 0~100으로 클램프하며 누락 시 recovered 처리"""
    if not isinstance(subs_in, dict):
        return None, bool(subs_in is not None)
    rec = False
    c1 = _clamp01(subs_in.get("correctness"))
    c2 = _clamp01(subs_in.get("completeness"))
    c3 = _clamp01(subs_in.get("clarity"))
    c4 = _clamp01(subs_in.get("practices"))
    if None in (c1, c2, c3, c4):
        return None, True
    fixed = Subscores(correctness=c1, completeness=c2, clarity=c3, practices=c4)
    # 누락 키는 위에서 None으로 처리되므로 여기선 OK
    # 값이 클램프되었는지 감지(근사): 원본과 다르면 recovered로 간주
    for k in ("correctness", "completeness", "clarity", "practices"):
        try:
            raw_v = float(subs_in.get(k))
        except Exception:
            rec = True
            continue
        if int(round(raw_v)) != getattr(fixed, k):
            rec = True
    return fixed, rec

def _to_float_0_5(v: Any, subs: Optional[Subscores], default: float = 3.0) -> Tuple[float, bool]:
    """
    final_score를 0~5 float로 보정.
    허용/복구 케이스:
      - 숫자/문자 "3.5", 3.5, 4
      - 유럽 표기 "3,5" -> 3.5
      - 분수 "4/5", "80/100" -> 0~5 스케일로 환산
      - 정수 "85" (0~100 오해) -> /20
      - 파싱 불가 & subscores 존재 -> 가중합으로 환산
      - 최종 실패 -> default(3.0)
    반환: (보정된 0~5, recovered여부)
    """
    # 1) 숫자 시도
    try:
        fs = float(v)
        if fs > 5.0001:       # 0~100로 온 경우로 추정
            return max(0.0, min(5.0, fs / 20.0)), True
        if fs < 0.0:
            return 0.0, True
        return min(fs, 5.0), False
    except Exception:
        pass

    # 2) 문자열 변형
    if isinstance(v, str):
        t = v.strip()
        # 유럽 소수점 "3,5"
        if re.fullmatch(r"\d+,\d+", t):
            try:
                fs = float(t.replace(",", "."))
                if fs > 5.0001:
                    fs = fs / 20.0
                return max(0.0, min(5.0, fs)), True
            except Exception:
                pass
        # 분수 "4/5" 또는 "80/100"
        m = re.fullmatch(r"(\d+(?:\.\d+)?)\s*/\s*(\d+(?:\.\d+)?)", t)
        if m:
            try:
                num, den = float(m.group(1)), float(m.group(2))
                if den > 0:
                    frac = num / den
                    fs = frac * 5.0
                    return max(0.0, min(5.0, fs)), True
            except Exception:
                pass
        # 정수 문자열 "85" 등
        if re.fullmatch(r"\d{1,3}", t):
            try:
                iv = int(t)
                if iv <= 5:
                    return float(iv), True
                if iv <= 100:
                    return max(0.0, min(5.0, iv / 20.0)), True
            except Exception:
                pass

    # 3) subscores로 환산 시도
    if subs:
        tot = (
            subs.correctness  * W_CORRECTNESS
          + subs.completeness * W_COMPLETENESS
          + subs.clarity      * W_CLARITY
          + subs.practices    * W_PRACTICES
        ) / 100.0  # 0~100
        fs = (tot / 100.0) * 5.0
        return max(0.0, min(5.0, fs)), True

    # 4) 최종 실패 -> 중립값(3.0)로 회복
    return default, True

def normalize_judge_json(raw: Dict[str, Any]) -> JudgeNormalized:
    """
    모델 JSON(raw)을 내부 표준 포맷으로 변환/보정.
    - final_score: float 0~5로 정규화(소수, 유럽소수, 분수, 0~100 오해까지 보정)
    - subscores: 누락/범위초과 시 전체 무효화 → final_score 환산 사용
    - criteria/feedback: 코드펜스 제거 + 길이 제한
    - 복구 개입 시 recovered=True로 표기
    """
    recovered = False

    # (1) criteria/feedback 정리
    crit_raw = raw.get("criteria", "")
    fb_raw = raw.get("feedback", "")
    crit_strip, r1 = _strip_code_fences(crit_raw)
    fb_strip, r2 = _strip_code_fences(fb_raw)
    criteria, r3 = _clip_len(str(crit_strip), TEXT_LIMIT)
    feedback, r4 = _clip_len(str(fb_strip), TEXT_LIMIT)
    recovered = recovered or r1 or r2 or r3 or r4

    # (2) subscores 보정
    subs_model, subs_rec = _coerce_subscores(raw.get("subscores"))
    recovered = recovered or subs_rec

    # (3) final_score 보정
    fs, fs_rec = _to_float_0_5(raw.get("final_score"), subs_model)
    recovered = recovered or fs_rec

    # (4) total 계산
    total = calc_total(fs, raw.get("subscores") if subs_model else None)
    # total이 0~100 사이로 보장됨

    # (5) 간단 언어 힌트
    txt = f"{criteria} {feedback}"
    lang = "ko" if _RE_HANGUL.search(txt) else "en"

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