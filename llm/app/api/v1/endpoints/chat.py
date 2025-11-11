from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import asyncio

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import stream_response_vllm
from app.models.llm_loader import get_llm_engine, get_tokenizer
# from app.models.vectordb_loader import get_vector_store
from app.models.mongodb_loader import get_mongodb
from app.services.use_mongodb import find_chatting_id, get_chat_history
from app.models.prompt_template import chosen_prompt, rejected_prompt

router = APIRouter()


@router.post("")
async def chat_vllm(request: ChatRequest, llm_engine=Depends(get_llm_engine), tokenizer=Depends(get_tokenizer), mongo_client=Depends(get_mongodb)):
    """
    스트림 답변 제공
    """
    user_input = request.user_input
    personal_prompt = request.personal_prompt
    message_uuid = str(request.message_uuid)
    
    try:
        # 사용자 대화 히스토리 불러오기
        chatting_id = await find_chatting_id(mongo_client, message_uuid)
        print(f"[채팅 번호] {chatting_id}")

        chat_history = await get_chat_history(mongo_client, int(chatting_id))
        print(f"[채팅 기록] {chat_history}")

    except Exception as e:
        print(f"ERROR {e}")
        chatting_id = None
        print(f"[채팅 번호] {chatting_id}\n=> 채팅 기록이 없습니다.")
        chat_history = ""

    # 답변 생성 체인
    chosen_chain = stream_response_vllm(llm_engine=llm_engine, tokenizer=tokenizer, prompt_type="chosen")
    chosen_payload = {
        "message_uuid": message_uuid,
        "service_prompt": chosen_prompt,
        "personal_prompt": personal_prompt,
        "question": user_input,
        "history": chat_history,
        "context": ""    # 벡터 DB 연결해봐야 함.
    }

    rejected_chain = stream_response_vllm(llm_engine=llm_engine, tokenizer=tokenizer, prompt_type="rejected")
    rejected_payload = {
        "message_uuid": message_uuid,
        "service_prompt": rejected_prompt,
        "personal_prompt": personal_prompt,
        "question": user_input,
        "history": chat_history,
        "context": ""    # 벡터 DB 연결해봐야 함.
    }
    
            
    async def event_generator():
        chosen_response = ""

        sequence_id = 0

        try:
            yield f"data: {ChatResponse(sequence_id=sequence_id, token='START').model_dump_json()}\n\n"
            
            async for chunk in chosen_chain.astream(chosen_payload):
                # print(chunk)
                if not chunk:
                    continue
                
                sequence_id += 1
                chosen_response += chunk

                yield f"data: {ChatResponse(sequence_id=sequence_id, token=chunk).model_dump_json()}\n\n"

            yield f"data: {ChatResponse(sequence_id=sequence_id+1, token='DONE').model_dump_json()}\n\n"
            print(f"[CHOSEN]\n{chosen_response}")
        
            rejected_response = ""
            async for chunk in rejected_chain.astream(rejected_payload):
                if chunk:
                    rejected_response += chunk

            yield f"data: {ChatResponse(sequence_id=-1, token=rejected_response).model_dump_json()}\n\n"
            print(f"[REJECTED]\n{rejected_response}")

        except Exception as e:
            # print(chunk)
            # 오류 시 스트림 종료
            yield f"data: [ERROR] {type(e).__name__}: {e}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
