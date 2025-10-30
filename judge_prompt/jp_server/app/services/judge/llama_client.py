# app/services/judge/llama_client.py
import httpx
from app.core.config import settings

LLAMA_URL=f"{settings.LLAMA_URL}/v1/judge"
MODEL_NAME=settings.MODEL_NAME

async def request_judge_output(SYSTEM_PROMPT, prompt):
    payload = {
        "systemprompt": SYSTEM_PROMPT,
        "prompt": prompt,        
    }


    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(LLAMA_URL, json=payload)
        try:
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(" Llama server error:", e)
            print("Response text:", response.text)
            raise