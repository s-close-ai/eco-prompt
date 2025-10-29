# app/models.py
from __future__ import annotations
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
import re, os

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
    final_score: float = Field(ge=0, le=5)
    subscores: Optional[Subscores] = None
    criteria: str
    feedback: str
    total: int = Field(ge=0, le=100)
    recovered: bool = False
    lang: Optional[str] = None

_RE_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.I)
_RE_HANGUL = re.compile(r"[가-힣]")

def _strip_code_fences(s: str) -> Tuple[str, bool]:
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

def _calc_total(final_score_0_5: float, subs: Optional[Dict]) -> int:
    if isinstance(subs, dict):
        c1 = _clamp01(subs.get("correctness"))
        c2 = _clamp01(subs.get("completeness"))
        c3 = _clamp01(subs.get("clarity"))
        c4 = _clamp01(subs.get("practices"))
        if None not in (c1, c2, c3, c4):
            return int((c1*W_CORRECTNESS + c2*W_COMPLETENESS + c3*W_CLARITY + c4*W_PRACTICES) // 100)
    return int(round((final_score_0_5 / 5.0) * 100))

def _coerce_subscores(subs_in: Any) -> Tuple[Optional[Subscores], bool]:
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
    try:
        fs = float(v)
        if fs > 5.0001:
            return max(0.0, min(5.0, fs / 20.0)), True
        if fs < 0.0:
            return 0.0, True
        return min(fs, 5.0), False
    except Exception:
        pass

    if isinstance(v, str):
        t = v.strip()
        if re.fullmatch(r"\d+,\d+", t):
            try:
                fs = float(t.replace(",", "."))
                if fs > 5.0001:
                    fs = fs / 20.0
                return max(0.0, min(5.0, fs)), True
            except Exception:
                pass
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
        if re.fullmatch(r"\d{1,3}", t):
            try:
                iv = int(t)
                if iv <= 5:
                    return float(iv), True
                if iv <= 100:
                    return max(0.0, min(5.0, iv / 20.0)), True
            except Exception:
                pass

    if subs:
        tot = (
            subs.correctness  * W_CORRECTNESS
          + subs.completeness * W_COMPLETENESS
          + subs.clarity      * W_CLARITY
          + subs.practices    * W_PRACTICES
        ) / 100.0
        fs = (tot / 100.0) * 5.0
        return max(0.0, min(5.0, fs)), True

    return default, True

def normalize_judge_json(raw: Dict[str, Any]) -> JudgeNormalized:
    recovered = False

    crit_raw = raw.get("criteria", "")
    fb_raw = raw.get("feedback", "")
    crit_strip, r1 = _strip_code_fences(crit_raw)
    fb_strip, r2 = _strip_code_fences(fb_raw)
    criteria, r3 = _clip_len(str(crit_strip), TEXT_LIMIT)
    feedback, r4 = _clip_len(str(fb_strip), TEXT_LIMIT)
    recovered = recovered or r1 or r2 or r3 or r4

    subs_model, subs_rec = _coerce_subscores(raw.get("subscores"))
    recovered = recovered or subs_rec

    fs, fs_rec = _to_float_0_5(raw.get("final_score"), subs_model)
    recovered = recovered or fs_rec

    total = _calc_total(fs, raw.get("subscores") if subs_model else None)

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

calc_total = _calc_total
