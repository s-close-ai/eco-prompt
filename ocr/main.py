import pymongo
import boto3
import os
import asyncio
from datetime import datetime
from dotenv import load_dotenv
import sys

# .env 파일 로드
load_dotenv()

from models import mongodb_loader
from ocr_processor import extract_text_from_s3
from models.file_events_repository import FileEventsRepository

# aws.s3.bucket 설정
AWS_ACCESS_KEY_ID = os.environ.get("S3_ACCESS_KEY")
AWS_SECRET_ACCESS_KEY = os.environ.get("S3_SECRET_KEY")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_URL")
DB_NAME = os.environ.get("ECO_MONGO_DB", "eco_prompt")
POLLING_INTERVAL = 5

# Boto3 S3 클라이언트 초기화
if not S3_BUCKET_NAME:
    print("S3_BUCKET_URL 환경 변수가 설정되어 있지 않습니다.")
    exit(1)

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name="ap-northeast-2")

async def process_job(job, file_events_repo):
    """ MongoDB에 저장된 FileEvent 작업을 처리하는 함수 """
    job_id = job["_id"]
    message_uuid = job["messageUUID"]
    user_input = job["user_input"]
    s3_keys = job.get("s3Key_list", [])

    print(f"작업 처리 시작 : {message_uuid}")

    try:
        all_extracted_texts = ""

        #loop = asyncio.get_running_loop()
        
        for key in s3_keys:
            all_extracted_texts += extract_text_from_s3(s3_client, S3_BUCKET_NAME, key) + "\n"
    
        final_prompt = all_extracted_texts + "\n" + user_input

        # 작업 완료 처리
        await file_events_repo.complete_job(job_id, final_prompt)
        print(f"작업 완료 : {message_uuid}")

    except Exception as e:
        print(f"작업 처리 중 오류 발생: {e}")


async def main_worker_loop():
    """ MongoDB를 계속 보면서 OCR 작업이 있는지 확인하는 함수 """
    print("Python 워커가 MongoDB 폴링을 시작합니다..")

    # 1. MongoDB 비동기 처리
    await mongodb_loader.load_mongodb()

    try:
        client = mongodb_loader.get_mongodb()
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
    # 🛠️ [수정] Windows 환경에서 asyncio 루프 정책 변경
    # ProactorEventLoop(기본값) 대신 SelectorEventLoop를 사용하도록 강제합니다.
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    print(f"MONGO_URI: {os.getenv('MONGO_URL')}")
    # print(f"DB_ECO: {_DB_ECO}")
    
    try:
        asyncio.run(main_worker_loop())
    except KeyboardInterrupt:
        print("\n🛑 워커가 종료되었습니다.")
