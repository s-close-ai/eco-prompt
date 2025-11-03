# judge_llm/api/api/app/ports.py
from typing import Protocol, Iterable, Dict, Any, List, Tuple, Optional

class MongoReader(Protocol):
    async def fetch_pairs(self, min_score: int) -> Iterable[Dict[str, Any]]: ...

class JudgeClient(Protocol):
    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]: ...

class SensitiveMasker(Protocol):
    def mask(self, text: str) -> str: ...

class TrainRepository(Protocol):
    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]: ...

class MainLlmClient(Protocol):
    async def train(self, batch_id: str, items: List[Dict[str, Any]]) -> Dict[str, Any]: ...
