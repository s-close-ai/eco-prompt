# 파이프라인 조립 팩토리 - build_pipeline
# judge/app/wiring.py
from typing import Dict, Any, Iterable
from .pipeline import ManualTrainPipeline
from .dummies import DummyMongoReader, DummyJudgeClient, RegexMasker, DummyTrainRepository, DummyMainLlmClient


def build_pipeline(seed_data: Iterable[Dict[str, Any]] = ()) -> ManualTrainPipeline:
    """
    더미 구현체들로 파이프라인 조립.
    - seed_data: Mongo 대용 초기 데이터
      예시 원소: {"pair_id":"p1","prompt":"...","answer":"...","score":72}
    """
    mongo  = DummyMongoReader(seed=seed_data)
    masker = RegexMasker()
    repo   = DummyTrainRepository()

    judge_impl = os.getenv("JUDGE_ADAPTER", "").lower()
    if judge_impl == "llama" or os.getenv("LLAMA_SERVER_URL"):
        from .adapters.judge_llama_http import HttpJudgeClient
        judge = HttpJudgeClient()
        print(f"[Judge] llama-server adapter enabled")
    else:
        judge = DummyJudgeClient()
        print(f"[Judge] dummy adapter enabled")

    import os
    if os.getenv("MAIN_LLM_URL"):
        from .adapters.main_llm_http import HttpMainLlmClient
        main_llm = HttpMainLlmClient()
        print(f"[MainLLM] HTTP adapter enabled → {os.getenv('MAIN_LLM_URL')}")
    else:
        main_llm = DummyMainLlmClient()
        print("[MainLLM] Dummy adapter in use (MAIN_LLM_URL not set)")

    from .pipeline import ManualTrainPipeline
    return ManualTrainPipeline(mongo=mongo, judge=judge, masker=masker, repo=repo, main_llm=main_llm)