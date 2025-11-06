# api/app/wiring.py
from __future__ import annotations
import os
from typing import Dict, Any, Iterable
from .pipeline import ManualTrainPipeline
from .dummies import DummyJudgeClient, DummyMainLlmClient
from .adapters.db.train_repository import EcoPromptMaskingRepository
from .masking.presidio_adapter import PresidioAdapter
from .adapters.db import mongo_connector as mongo

def build_pipeline(seed_data: Iterable[Dict[str, Any]] = ()) -> ManualTrainPipeline:
    mongo.ping()
    mongo.ensure_indexes()

    masker = PresidioAdapter()

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

    eco_repo = EcoPromptMaskingRepository()
    print(f"[MongoDB] 저장 활성화 → DB={os.getenv('ECO_MONGO_DB')}, MASK_COLL={os.getenv('ECO_MASK_COLL')}")

    return ManualTrainPipeline(
        mongo=mongo,
        judge=judge,
        masker=masker,
        main_llm=main_llm,
        eco_repo=eco_repo,
    )
