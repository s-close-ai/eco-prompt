# judge_llm/api/api/app/adapters/db/train_repository.py
from __future__ import annotations
from typing import List, Dict, Any, Tuple
from pymongo import UpdateOne
from datetime import datetime

from .mongo_connector import get_collection, ensure_unique_index

class MongoTrainRepository:
    def __init__(self):
        ensure_unique_index()

    async def upsert_many(self, rows: List[Dict[str, Any]]) -> Tuple[int, int]:
        """
        반환값: (upserted_count, failed_count)
        - created_at: insert 시에만 기록
        - updated_at: 매 업서트 시 갱신
        - 키: (batch_id, message_id)
        """
        if not rows:
            return (0, 0)

        coll = get_collection()
        now = datetime.utcnow()
        ops = []

        for d in rows:
            d = dict(d)
            # 필수키 방어
            for k in ("batch_id", "message_id", "prompt", "llm_response", "rejected_response"):
                if k not in d:
                    raise ValueError(f"missing required key: {k}")

            filt = {"batch_id": d["batch_id"], "message_id": d["message_id"]}

            set_fields = dict(d)
            set_fields["updated_at"] = now

            ops.append(UpdateOne(
                filt,
                {"$set": set_fields, "$setOnInsert": {"created_at": now}},
                upsert=True
            ))

        res = coll.bulk_write(ops, ordered=False)
        upserts = len(getattr(res, "upserted_ids", {}) or {})
        # 실패 건수는 bulk_write 레벨에서 예외가 나므로, 여기서는 0으로 처리
        return (upserts, 0)
