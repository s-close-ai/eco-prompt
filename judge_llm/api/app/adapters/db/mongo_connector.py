# api/app/adapters/db/mongo_connector.py
import os
from datetime import datetime
from typing import List, Dict, Any
from pymongo import MongoClient, UpdateOne

_URI  = os.getenv("MONGO_URI")
_DB   = os.getenv("MONGO_DB") or "admin"           # 확정 전 임시
_COLL = os.getenv("MONGO_COLL") or "train_dataset" # 확정 전 임시
_TO   = int(os.getenv("MONGO_TIMEOUT_MS", "5000"))

_client: MongoClient | None = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_URI, serverSelectionTimeoutMS=_TO)
    return _client

def ping() -> None:
    get_client().admin.command("ping")  # 실패 시 예외
    print("[MongoDB] ✅ 몽고디비 헬스체크")

def get_collection():
    cli = get_client()
    return cli[_DB][_COLL]

def ensure_unique_index() -> None:
    # (batch_id, message_id) 멱등 업서트 보장
    coll = get_collection()
    coll.create_index(
        [("batch_id", 1), ("message_id", 1)],
        unique=True,
        name="uidx_batch_message"
    )

def upsert_many_minimal(docs: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    docs: 4) 구조와 동일한 문서 리스트
      - 필수 키: batch_id, message_id, prompt, llm_response, rejected_response
      - 선택 키: judge_total, passed
    업서트 키: (batch_id, message_id)
    """
    if not docs:
        return {"matched": 0, "modified": 0, "upserts": 0}

    coll = get_collection()
    now = datetime.utcnow()
    ops = []
    for d in docs:
        d = dict(d)  # 방어적 복사
        filt = {"batch_id": d["batch_id"], "message_id": d["message_id"]}
        # 필수키 검증(방어)
        for k in ("batch_id", "message_id", "prompt", "llm_response", "rejected_response"):
            if k not in d:
                raise ValueError(f"missing required key: {k}")

        set_fields = dict(d)
        set_fields["updated_at"] = now
        ops.append(UpdateOne(
            filt,
            {"$set": set_fields, "$setOnInsert": {"created_at": now}},
            upsert=True
        ))
        
    res = coll.bulk_write(ops, ordered=False)
    return {
        "matched": getattr(res, "matched_count", 0),
        "modified": getattr(res, "modified_count", 0),
        "upserts": len(getattr(res, "upserted_ids", {}) or {})
    }
