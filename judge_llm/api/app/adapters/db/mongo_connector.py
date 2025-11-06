# api/app/adapters/db/mongo_connector.py
import os
from datetime import datetime
from typing import List, Dict, Any
from pymongo import MongoClient, UpdateOne

_URI  = os.getenv("MONGO_URI")
_TO   = int(os.getenv("MONGO_TIMEOUT_MS", "5000"))

_DB_ECO      = os.getenv("ECO_MONGO_DB") or "eco_prompt"
_COLL_MASK   = os.getenv("ECO_MASK_COLL") or "masking_message"
_MASK_UPSERT = os.getenv("ECO_MASK_UPSERT", "false").lower() == "true"

_client: MongoClient | None = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_URI, serverSelectionTimeoutMS=_TO)
    return _client

def ping() -> None:
    get_client().admin.command("ping")
    print("[MongoDB] ✅ 몽고디비 헬스체크")

def coll_masking():
    return get_client()[_DB_ECO][_COLL_MASK]

def ensure_indexes() -> None:
    coll_masking().create_index(
        [("messageUUID", 1), ("sender_type", 1)],
        name="uidx_uuid_sender",
        unique=True
    )

def mask_upsert_or_insert_many(docs: List[Dict[str, Any]]) -> int:
    if not docs:
        return 0
    c = coll_masking()
    now = datetime.utcnow()

    if _MASK_UPSERT:
        ops = []
        for d in docs:
            d = dict(d)
            # 생성시 1회만: _ts 는 setOnInsert로만 넣고, set 대상에서는 제거
            d.pop("_ts", None)
            d.setdefault("_source", d.get("_source") or "closeai")

            filt = {
                "messageUUID": d.get("messageUUID"),
                "sender_type": d.get("sender_type"),
            }

            update = {
                # 내용 갱신(마스킹된 content 포함)
                "$set": d,
                # 최초 insert시에만 생성 시각 기록
                "$setOnInsert": {"_ts": now},
                # 매 업서트 시 갱신 시각 자동 기록
                "$currentDate": {"updated_at": True},
            }

            ops.append(UpdateOne(filt, update, upsert=True))

        res = c.bulk_write(ops, ordered=False)
        # 처리 수는 대략적으로 upsert + modified로 계산 (상황에 따라 matched도 참고 가능)
        upserts = len(getattr(res, "upserted_ids", {}) or {})
        modified = getattr(res, "modified_count", 0)
        return upserts + modified or len(ops)

    else:
        # insert 모드: 생성 시각 기본값 세팅
        for d in docs:
            d.setdefault("_ts", now)
            d.setdefault("_source", d.get("_source") or "closeai")
        res = c.insert_many(docs, ordered=False)
        return len(getattr(res, "inserted_ids", []) or [])
