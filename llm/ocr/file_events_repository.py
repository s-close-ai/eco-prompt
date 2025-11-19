from datetime import datetime
from pymongo.database import Database

FILE_EVENT_COLLECTION = "file_events"

class FileEventsRepository:

    def __init__(self, db: Database):
        self.collection = db[FILE_EVENT_COLLECTION]

    async def find_and_start_job(self):
        return await self.collection.find_one_and_update(
            {"status":"PENDING"},
            {"$set": {"status": "PROCESSING", "updatedAt": datetime.now()}}
        )
    
    async def complete_job(self, job_id, final_prompt):
        await self.collection.update_one(
            {"_id": job_id},
            {"$set": {"status": "COMPLETED", "final_prompt": final_prompt, "updatedAt": datetime.now()}}
        )
    
    async def fail_job(self, job_id, error_message):
        await self.collection.update_one(
            {"_id": job_id},
            {"$set": {"status": "ERROR", "error_message": error_message, "updatedAt": datetime.now()}}
        )
    
    