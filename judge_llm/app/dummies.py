# 더미 구현체 4종 (Mongo/Judge/Masker/Repo/Main)
# judge/app/dummies.py
from typing import Dict, Any, Iterable, List, Tuple, Optional
import re
import asyncio

class DummyMongoReader:
    def __init__(self, seed: Iterable[Dict[str, Any]] = ()):
        self._data = list(seed)

    async def fetch_pairs(self, min_score: int) -> Iterable[Dict[str, Any]]:
        await asyncio.sleep(0)
        if not self._data:
            return []
        return [d for d in self._data if int(d.get("score", -1)) >= int(min_score)]

class DummyJudgeClient:
    """
    아주 단순한 규칙 기반 더미 점수 (테스트 재현 목적)
    """
    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        await asyncio.sleep(0)
        txt = (answer or "") + " " + (prompt or "")
        txt_low = txt.lower()
        if "42" in txt_low or "5*5" in txt_low or "25" in txt_low:
            final = 5.0
            subs = {"correctness": 95, "completeness": 90, "clarity": 90, "practices": 85}
        elif any(k in txt_low for k in ["정답", "답은", "결과는"]):
            final = 4.0
            subs = {"correctness": 80, "completeness": 75, "clarity": 75, "practices": 70}
        else:
            final = 3.0
            subs = {"correctness": 60, "completeness": 55, "clarity": 55, "practices": 50}
        return {"final_score": final, "feedback": "dummy-eval", "subscores": subs}

class RegexMasker:
    _rules = [
        (re.compile(r"\b\d{6}-\d{7}\b"), "<RRN>"),
        (re.compile(r"\b01[016789]-?\d{3,4}-?\d{4}\b"), "<PHONE>"),
        (re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"), "<EMAIL>"),
        (re.compile(r"\b(?:\d[ -]*?){13,19}\b"), "<CARD>"),
    ]
    def mask(self, text: str) -> str:
        s = text or ""
        for pat, repl in self._rules:
            s = pat.sub(repl, s)
        return s

class DummyTrainRepository:
    def __init__(self):
        self._rows: List[Dict[str, Any]] = []

    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]:
        self._rows.extend(rows)
        await asyncio.sleep(0)
        return (len(rows), 0)

    def snapshot(self) -> List[Dict[str, Any]]:
        return list(self._rows)

class DummyMainLlmClient:
    async def train(self, items: List[Dict[str, Any]], batch_id: Optional[str] = None) -> Dict[str, Any]:
        await asyncio.sleep(0)
        return {
            "ok": True,
            "received": len(items),
            "batch_id": batch_id,
            "sample": items[0] if items else None
        }
