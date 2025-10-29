# 외부 의존성 인터페이스
# judge/app/ports.py
from typing import Protocol, Iterable, Dict, Any, List, Tuple, Optional

class MongoReader(Protocol):
    async def fetch_pairs(self, min_score: int) -> Iterable[Dict[str, Any]]:
        """
        MongoDB에서 '기존 점수 >= min_score' 인 (prompt, answer, score, pair_id, batch_id ...)를 반환.
        - 연결 문자열/컬렉션명 등은 미정: 구현체에서 처리(TODO).
        """
        ...

class JudgeClient(Protocol):
    async def evaluate(self, prompt: str, answer: str) -> Dict[str, Any]:
        """
        Prometheus-2(llama-server) 호출.
        반환 키 이름은 확정 전: 실제 매핑은 구현체/파서에서 처리(TODO).
        """
        ...

class SensitiveMasker(Protocol):
    def mask(self, text: str) -> str:
        """민감정보 마스킹. 정규식/룰은 스토리5에서 확정."""
        ...

class TrainRepository(Protocol):
    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]:
        """
        훈련 데이터 배치 업서트.
        - 스키마/컬럼/연결은 미정: 구현체에서 처리(TODO).
        반환: (성공 건수, 실패 건수)
        """
        ...

class MainLlmClient(Protocol):
    async def train(self, items: List[Dict[str, Any]], batch_id: Optional[str] = None) -> Dict[str, Any]:
        """
        마스킹된 학습 항목을 배치 단위로 전송합니다.
        items 예:
          [
            {"pair_id":"...", "prompt":"...", "answer_user":"...", "answer_train":"..."},
            ...
          ]
        """
        ...