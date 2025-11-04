# api/app/adapters/db/train_repository.py
from __future__ import annotations
from typing import List, Dict, Any, Tuple
from . import mongo_connector as mongo

# 기존 train_dataset 경로 제거. 호환성만 유지하는 no-op 저장소.
class MongoTrainRepository:
    def __init__(self):
        mongo.ensure_indexes()
    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]:
        return (0, 0)

class EcoPromptMaskingRepository:
    def __init__(self):
        mongo.ensure_indexes()
    async def upsert_or_insert_many(self, docs: List[Dict[str, Any]]) -> int:
        return mongo.mask_upsert_or_insert_many(docs)
