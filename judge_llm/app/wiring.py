# 파이프라인 조립 팩토리 - build_pipeline
# judge/app/wiring.py
from typing import Dict, Any, Iterable
from .pipeline import ManualTrainPipeline
from .dummies import DummyMongoReader, DummyJudgeClient, RegexMasker, DummyTrainRepository

def build_pipeline(seed_data: Iterable[Dict[str, Any]] = ()) -> ManualTrainPipeline:
    """
    더미 구현체들로 파이프라인 조립.
    - seed_data: Mongo 대용 초기 데이터
      예시 원소: {"pair_id":"p1","prompt":"...","answer":"...","score":72}
    """
    mongo  = DummyMongoReader(seed=seed_data)
    judge  = DummyJudgeClient()
    masker = RegexMasker()
    repo   = DummyTrainRepository()
    return ManualTrainPipeline(mongo=mongo, judge=judge, masker=masker, repo=repo)
