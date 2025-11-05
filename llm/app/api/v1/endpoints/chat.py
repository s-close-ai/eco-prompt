from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest, ChatResponse
from app.services.chat import stream_response
from app.models.llm_loader import get_llm, get_tokenizer
from app.models.vectordb_loader import get_vector_store
from app.models.mongodb_loader import find_chatting_id, get_chat_history

router = APIRouter()

@router.post("")
async def chat(request: ChatRequest, llm=Depends(get_llm), tokenizer=Depends(get_tokenizer), vector_store=Depends(get_vector_store)):
    """
    스트림 답변 제공
    """
    user_input = request.user_input
    personal_prompt = request.personal_prompt
    message_uuid = request.message_uuid

    # 사용자 대화 히스토리 불러오기
    chatting_id = find_chatting_id(message_uuid)
    if chatting_id:
        chat_history = get_chat_history(chatting_id)
        # content와 senderType을 조합해서 histroy 생성하는 코드 필요함.
        chat_history = "히스토리 요약 생성 예정"
    else:
        chat_history = ""

    chain = stream_response(vector_store=vector_store, llm=llm, tokenizer=tokenizer)
    payload = {
        "personal_prompt": personal_prompt,
        "question": user_input,
        "history": chat_history,
    }

    async def event_generator():
        state = "SEEK_OPEN_CHOSEN"
        chosen_response = ""
        rejected_response = ""

        OPEN_C  = "<CHOSEN>"
        CLOSE_C = "</CHOSEN>"
        OPEN_R  = "<REJECTED>"
        CLOSE_R = "</REJECTED>"
        
        sequence_id = -1
        try:
            async for chunk in chain.astream(payload):
                if not chunk:
                    continue
                
                sequence_id += 1

                if (state == "SEEK_OPEN_CHOSEN") and (OPEN_C in chunk):
                    state = "FOUND_CHOSEN"
                    yield f"data: {ChatResponse(sequence_id=sequence_id, token="START").model_dump_json()}\n\n"
                    continue
                

                if (state == "FOUND_CHOSEN") and (OPEN_C not in chunk) and (CLOSE_C not in chunk):
                    chosen_response += chunk
                    yield f"data: {ChatResponse(sequence_id=sequence_id, token=chunk).model_dump_json()}\n\n"
                    continue

                
                if (state == "FOUND_CHOSEN") and (OPEN_C not in chunk) and (CLOSE_C in chunk):
                    state = "END_CHOSEN"
                    yield f"data: {ChatResponse(sequence_id=sequence_id, token='DONE').model_dump_json()}\n\n"
                    continue


                if (state == "END_CHOSEN") and (OPEN_R in chunk):
                    state = "FOUND_REJECTED"
                    continue


                if (state == "FOUND_REJECTED") and (OPEN_R not in chunk) and (CLOSE_R not in chunk):
                    rejected_response += chunk
                    continue


                if (state == "FOUND_REJECTED") and (OPEN_R not in chunk) and (CLOSE_R in chunk):
                    break

            print(f"[CHOSEN]\n{chosen_response}")
        
        except Exception as e:
            # 오류 시 스트림 종료
            yield f"data: [ERROR] {type(e).__name__}: {e}\n\n"

        print(f"[REJECTED]\n{rejected_response}")

        # rejected response 저장하기

    return StreamingResponse(event_generator(), media_type="text/event-stream")