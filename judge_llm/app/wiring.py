# 파이프라인 조립 팩토리 - build_pipeline
# judge/app/wiring.py
from __future__ import annotations
import os
from typing import Dict, Any, Iterable

from .pipeline import ManualTrainPipeline
from .dummies import (
    DummyMongoReader,
    DummyJudgeClient,
    RegexMasker,
    DummyTrainRepository,
    DummyMainLlmClient,
)

def build_pipeline(seed_data: Iterable[Dict[str, Any]] = ()) -> ManualTrainPipeline:
    """
    파이프라인 조립 팩토리.
      - 기본은 더미 구현체 사용
      - JUDGE_ADAPTER=llama 또는 LLAMA_SERVER_URL 존재 시 llama-server HTTP 어댑터 사용
      - MAIN_LLM_URL 존재 시 메인 LLM HTTP 어댑터 사용
    seed_data: Mongo 대용 초기 데이터 (로컬 스모크용)
    """
    # Base components (always available)
    mongo  = DummyMongoReader(seed=seed_data)
    masker = RegexMasker()
    repo   = DummyTrainRepository()

    # Judge adapter selection
    judge_adapter = (os.getenv("JUDGE_ADAPTER") or "").lower()
    use_llama = judge_adapter == "llama" or bool(os.getenv("LLAMA_SERVER_URL"))
    if use_llama:
        from .adapters.judge_llm_http import HttpJudgeClient
        judge = HttpJudgeClient()
        print(f"[Judge] llama-server 어댑터 활성화 → {os.getenv('LLAMA_SERVER_URL')}")
    else:
        judge = DummyJudgeClient()
        print("[Judge] 더미 어댑터 사용 중 (JUDGE_ADAPTER=llama 또는 LLAMA_SERVER_URL 설정 필요)")

    # Main LLM adapter selection
    if os.getenv("MAIN_LLM_URL"):
        from .adapters.main_llm_http import HttpMainLlmClient
        main_llm = HttpMainLlmClient()
        print(f"[MainLLM] 메인 LLM HTTP 어댑터 활성화 → {os.getenv('MAIN_LLM_URL')}")
    else:
        main_llm = DummyMainLlmClient()
        print("[MainLLM] 더미 메인 LLM 어댑터 사용 중 (MAIN_LLM_URL 미설정)")

    return ManualTrainPipeline(
        mongo=mongo,
        judge=judge,
        masker=masker,
        repo=repo,
        main_llm=main_llm,
    )
