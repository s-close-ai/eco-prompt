# 더미 구현체 4종 (Mongo/Judge/Masker/Repo) - 추후 제거
# judge/app/dummies.py
from typing import Dict, Any, Iterable, List, Tuple
import re
import asyncio

class DummyMongoReader:
    """
    실제 Mongo 대신 메모리 리스트로 대체.
    - 이후 실제 Mongo 구현체로 교체하면 됨.
    """
    def __init__(self, seed: Iterable[Dict[str, Any]] = ()):
        self._data = list(seed)

    async def fetch_pairs(self, min_score: int) -> Iterable[Dict[str, Any]]:
        await asyncio.sleep(0)  # 비동기 인터페이스 유지
        # 기존 'score'가 min_score 이상인 데이터만 리턴(없으면 전부 리턴하도록 바꿔도 됨)
        if not self._data:
            return []
        return [d for d in self._data if int(d.get("score", -1)) >= int(min_score)]

class DummyJudgeClient:
    """
    실제 Prometheus-2 대신 간단 점수 규칙:
    - prompt/answer 길이 기반 가짜 점수(예: min(len)//5 제한 0~100)
    - 이후 실제 llama-server 호출 구현체로 교체
    """
    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        await asyncio.sleep(0)
        base = min(len(prompt), len(answer))
        score = max(0, min(100, base // 5))
        return {"score": score, "feedback": "dummy-eval"}

class RegexMasker:
    """
    아주 기본적인 마스킹 규칙. (스토리5에서 정식 규칙 확정)
    """
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
    """
    실제 DB 대신 결과를 메모리에 적재하는 더미.
    - upsert_many는 성공 건수만 반환.
    """
    def __init__(self):
        self._rows: List[Dict[str, Any]] = []

    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]:
        self._rows.extend(rows)
        await asyncio.sleep(0)
        return (len(rows), 0)

    # 디버그 용으로 현재 적재된 행을 볼 수 있게
    def snapshot(self) -> List[Dict[str, Any]]:
        return list(self._rows)

class DummyMainLlmClient:
    """
    메인 LLM 훈련 API 호출 더미.
    - 실제 연동 전까지는 개수/샘플만 회신.
    """
    async def train(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        await asyncio.sleep(0)
        return {
            "ok": True,
            "received": len(items),
            "sample": items[0] if items else None
        }