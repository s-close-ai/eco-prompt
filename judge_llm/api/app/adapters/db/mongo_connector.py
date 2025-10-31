# api/app/adapters/db/mongo_connector.py
import os
from pymongo import MongoClient

_URI  = os.getenv("MONGO_URI")
# 스키마 확정 전: admin으로 fallback
_DB   = os.getenv("MONGO_DB") or "admin"
# 콜렉션 확정 전: train_dataset으로 fallback     
_COLL = os.getenv("MONGO_COLL") or "train_dataset"
_TO   = int(os.getenv("MONGO_TIMEOUT_MS", "5000"))

_client: MongoClient | None = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(_URI, serverSelectionTimeoutMS=_TO)
    return _client

def ping() -> None:
    get_client().admin.command("ping")  # 실패 시 예외 발생
    print("[MongoDB] ✅ 몽고디비 헬스체크")

def get_collection():
    cli = get_client()
    return cli[_DB][_COLL]
