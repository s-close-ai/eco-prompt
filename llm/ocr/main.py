import pymongo
import boto3
import time
import os
import asyncio
from datetime import datetime

from app.models.mongodb_loader import load_mongodb, mongo_client
from .ocr_processor import extract_text_from_s3
from .file_events_repository import FileEventsRepository

# aws.s3.bucket 설정
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_URL")
DB_NAME = os.environ.get("ECO_MONGO_DB", "eco_prompt")
POLLING_INTERVAL = 5

# Boto3 S3 클라이언트 초기화
s3_client = boto3.client('s3')

if not S3_BUCKET_NAME:
    print("S3_BUCKET_URL 환경 변수가 설정되어 있지 않습니다.")
    exit(1)

async def process_job(job, file_events_repo):
    """ MongoDB에 저장된 FileEvent 작업을 처리하는 함수 """
    job_id = job["_id"]
    message_uuid = job["messageUUID"]
    user_input = job["user_input"]
    s3_keys = job.get("s3Key_list", [])

    print(f"작업 처리 시작 : ${message_uuid}")

    try:
        all_extracted_texts = ""
        
        for key in s3_keys:
            all_extracted_texts += extract_text_from_s3(s3_client, S3_BUCKET_NAME, key) + "\n"
    
        final_prompt = all_extracted_texts + "\n" + user_input

        # 작업 완료 처리
        await file_events_repo.complete_job(job_id, final_prompt)
        print(f"작업 완료 : ${message_uuid}")

    except Exception as e:
        print(f"작업 처리 중 오류 발생: {e}")


async def main_worker_loop():
    """ MongoDB를 계속 보면서 OCR 작업이 있는지 확인하는 함수 """
    
    print("Python 워커가 MongoDB 폴링을 시작합니다..")
    # 1. MongoDB 비동기 처리
    await load_mongodb()

    try:
        client = mongo_client
        db = client[DB_NAME]

        file_events_repo = FileEventsRepository(db)

        while True:
            try:
                job = await file_events_repo.find_and_start_job()

                if job:
                    await process_job(job, file_events_repo)
                else:
                    await asyncio.sleep(POLLING_INTERVAL)
            
            except Exception as e:
                print(f"작업 처리 중 오류 발생: {e}")
                await asyncio.sleep(POLLING_INTERVAL * 2)

    except Exception as e:
        print(f"MongoDB 연결 실패: {e}")

if __name__ == "__main__":

    print(f"MONGO_URI: {os.getenv('MONGO_URI')}")
    print(f"DB_ECO: {_DB_ECO}")
    
    main_worker_loop()
