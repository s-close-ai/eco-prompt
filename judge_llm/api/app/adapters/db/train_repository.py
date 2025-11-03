# judge_llm/api/api/app/adapters/db/train_repository.py
from __future__ import annotations
from typing import List, Dict, Any, Tuple
from .mongo_connector import get_collection, ensure_unique_index
from pymongo import UpdateOne
from datetime import datetime

class MongoTrainRepository:
    def __init__(self):
        ensure_unique_index()

    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]:
        if not rows:
            return (0, 0)
        coll = get_collection()
        now = datetime.utcnow()
        ops = []
        for d in rows:
            d = dict(d)
            d.setdefault("created_at", now)
            d["updated_at"] = now
            filt = {"batch_id": d["batch_id"], "message_id": d["message_id"]}
            ops.append(UpdateOne(filt, {"$set": d}, upsert=True))

        res = coll.bulk_write(ops, ordered=False)
        upserts = len(getattr(res, "upserted_ids", {}) or {})
        modified = getattr(res, "modified_count", 0)
        # 정확히: (신규 upsert 개수, 수정 개수) 반환
        return (upserts, modified)