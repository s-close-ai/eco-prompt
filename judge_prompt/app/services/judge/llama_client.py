# app/services/judge/llama_client.py
import httpx
from app.core.config import settings

LLAMA_URL=f"{settings.LLAMA_URL}/chat/completions"
MODEL_NAME=settings.MODEL_NAME

async def request_judge_output(SYSTEM_PROMPT, prompt, grammar_schema):
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 512,
        "temperature": 0.2,
        "grammar": grammar_schema,
        
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