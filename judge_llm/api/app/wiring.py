# 파이프라인 조립 팩토리 - build_pipeline
# judge_llm/api/app/wiring.py
from __future__ import annotations
import os
from typing import Dict, Any, Iterable
from .pipeline import ManualTrainPipeline
from .dummies import DummyJudgeClient, DummyTrainRepository, DummyMainLlmClient
from .adapters.db.train_repository import MongoTrainRepository
from .masking.presidio_adapter import PresidioAdapter
from .adapters.db import mongo_connector as mongo



def build_pipeline(seed_data: Iterable[Dict[str, Any]] = ()) -> ManualTrainPipeline:
    mongo.ping()
    mongo.ensure_unique_index()
    mongo_ref = mongo
    masker = PresidioAdapter()
    repo = MongoTrainRepository()

    judge_adapter = (os.getenv("JUDGE_ADAPTER") or "").lower()
    use_llama = judge_adapter == "llama" or bool(os.getenv("LLAMA_SERVER_URL"))
    if use_llama:
        from .adapters.judge_llm_http import HttpJudgeClient
        judge = HttpJudgeClient()
        print(f"[Judge] llama-server 어댑터 활성화 → {os.getenv('LLAMA_SERVER_URL')}")
    else:
        judge = DummyJudgeClient()
        print("[Judge] 더미 어댑터 사용 중 (JUDGE_ADAPTER=llama 또는 LLAMA_SERVER_URL 설정 필요)")

    if os.getenv("MAIN_LLM_URL"):
        from .adapters.main_llm_http import HttpMainLlmClient
        main_llm = HttpMainLlmClient()
        print(f"[MainLLM] 메인 LLM HTTP 어댑터 활성화 → {os.getenv('MAIN_LLM_URL')}")
    else:
        main_llm = DummyMainLlmClient()
        print("[MainLLM] 더미 메인 LLM 어댑터 사용 중 (MAIN_LLM_URL 미설정)")

    return ManualTrainPipeline(
        mongo=mongo_ref,
        judge=judge,
        masker=masker,
        repo=repo,
        main_llm=main_llm,
    )