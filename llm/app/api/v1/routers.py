from fastapi import APIRouter
from app.api.v1.endpoints import train

# API에 대한 메인 라우터 만들기
api_router = APIRouter()

api_router.include_router(
    train.router,
    prefix="/train",
    tags=["train"]
)