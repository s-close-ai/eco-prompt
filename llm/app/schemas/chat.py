# 사용자 질의 응답 스키마
from pydantic import BaseModel, Field
from typing import Optional

# 응답
class ChatResponse(BaseModel):
    request_id: str   
    llm_response: str | None    # None일 수 있음. => 에러일 때
    message_sender: str    # chosen 부분은 AI, rejected 부분은 TRAINING
    
# 요청 : JAVA 서버에서 보낸 JSON 데이터와 일치 시키기
class ChatRequest(BaseModel):
    user_input: str
    request_id: str    