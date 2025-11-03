from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.schemas.chat import ChatRequest
from app.services.chat import stream_response
from app.models.llm_loader import get_llm, get_tokenizer
from app.models.vectordb_loader import get_vector_store

router = APIRouter()

@router.post("/test")
async def chat(request: ChatRequest, llm=Depends(get_llm), tokenizer=Depends(get_tokenizer), vector_store=Depends(get_vector_store)):
    """
    스트림 답변 제공
    - 아직 chosen, rejected 구분하지 않음.
    """
    user_input = request.user_input
    request_id = request.request_id

    chain = stream_response(vector_store=vector_store, llm=llm, tokenizer=tokenizer)
    payload = {
        "question": user_input,
        "history": "",
        "context": ""
    }

    async def event_generator():
        state = "SEEK_OPEN_CHOSEN"
        chosen_response = ""
        rejected_response = []

        OPEN_C  = "<CHOSEN>"
        CLOSE_C = "</CHOSEN>"
        OPEN_R  = "<REJECTED>"
        CLOSE_R = "</REJECTED>"
        TAIL    = 32  # 태그 경계 대비 꼬리 버퍼
        
        try:
            for chunk in chain.stream(payload):
                if not chunk:
                    continue
                
                if "<|eot_id|" in chunk:
                    yield f'data: {chunk.replace("<|eot_id|", "")}'

                yield f"data: {chunk}\n\n"

            #     chosen_response += chunk
            #     print(chosen_response)

            #     while True:
            #         if state == "SEEK_OPEN_CHOSEN":
            #             i = chosen_response.find(OPEN_C)
            #             if i == -1:
            #                 # chosen 표시 전까지는 버림
            #                 chosen_response = chosen_response[-TAIL:]
            #                 break
                        
            #             chosen_response = chosen_response[i + len(OPEN_C):]
            #             state = "IN_CHOSEN"

            #         if state == "IN_CHOSEN":
            #             j = chosen_response.find(CLOSE_C)
            #             if j == -1:
            #                 if len(chosen_response) > TAIL:
            #                     out, chosen_response = chosen_response[:-TAIL], chosen_response[-TAIL:]
            #                     yield f"data: {chosen_response}\n\n"
            #                 break
                        
            #             out, chosen_response = chosen_response[:j], chosen_response[j+len(CLOSE_C):]
            #             if out:
            #                 yield f"data: {out}\n\n"
                        
            #             state = "SEEK_OPEN_REJECTED"
                    
            #         if state == "SEEK_OPEN_REJECTED":
            #             k = chosen_response.find(OPEN_R)
            #             if k == -1:
            #                 chosen_response = chosen_response[-TAIL:]
            #                 break

            #             chosen_response = chosen_response[k + len(OPEN_R):]
            #             state = "IN_REJECTED"
                    
            #         if state == "IN_REJECTED":
            #             m = chosen_response.find(CLOSE_R)
            #             if m == -1:
            #                 rejected_response.append(chosen_response)
            #                 chosen_response = ""
            #                 break

            #             rejected_response.append(chosen_response[:m])
            #             chosen_response = chosen_response[m + len(CLOSE_R):]
            #             state = "DONE"
                    
            #         if state == "DONE":
            #             chosen_response = ""
            #             break

            # if state == "IN_CHOSEN" and chosen_response:
            #     yield f"data: {chosen_response}\n\n"

            # rejected_text = "".join(rejected_response).strip()
            # if rejected_text:
            #     print("=== reject ===")
            #     print(rejected_text)
            # yield "data: [DONE]"
        
        except Exception as e:
            # 오류 시 스트림 종료
            yield f"data: [ERROR] {type(e).__name__}: {e}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")