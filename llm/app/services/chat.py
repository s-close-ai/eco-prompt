from langchain_core.runnables import RunnableLambda, RunnableParallel
from vllm.sampling_params import RequestOutputKind
from vllm import SamplingParams

from app.models.prompt_template import routing_prompt, basic_prompt
from app.services.pdf_tools import get_tool_definitions, parse_midm_tool_call, parse_qwen_tool_call, execute_tool


def get_sampling_params(prompt_type: str, question_type: str) -> SamplingParams:
    """prompt_type과 question_type에 따라 SamplingParams 객체를 생성합니다."""

    if question_type in ["code", "algorithm", "math"]:
        stop_tokens = ["<|im_end|>", "<|endoftext|>"]

    elif question_type in ["ssafy", "general"]:
        stop_tokens = ["<|eot_id|>", "<|end_of_text|>"]

    if prompt_type == "chosen":
        return SamplingParams(
            max_tokens=2048,
            temperature=0.4,
            top_p=0.95,
            seed=42,
            repetition_penalty=1.01,
            frequency_penalty=0.2,
            presence_penalty=0.1,
            output_kind=RequestOutputKind.DELTA,
            stop=stop_tokens
        )

    elif prompt_type == "rejected":
        return SamplingParams(
            max_tokens=2048,
            temperature=1.0,
            top_p=0.95,
            seed=42,
            repetition_penalty=1.01,
            frequency_penalty=0.2,
            presence_penalty=0.1,
            stop=stop_tokens
        )

def get_router_sampling_params(tokenizer) -> SamplingParams:

    eos_token_id = [tokenizer.eos_token_id, tokenizer.convert_tokens_to_ids("<|eot_id|>")]

    return SamplingParams(
        max_tokens=64,
        temperature=0.1,
        top_p=0.95,
        seed=42,
        frequency_penalty=1.3,
        stop_token_ids=eos_token_id
    )

async def find_question_type(llm_engine_2, tokenizer_2):
    """사용자 질문의 타입을 분류한다."""

    def build_prompt_with_routing_template(user_info: dict) -> str:
        """
        """
        question = str(user_info.get("question", ""))

        messages = [
            {"role": "system", "content": routing_prompt},
            {"role": "user", "content": question},
        ]

        return tokenizer_2.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

    make_prompt_route = RunnableLambda(build_prompt_with_routing_template)

    async def call_vllm_engine_router(inputs: dict):
        """vLLM Midm 엔진을 호출하여 질문을 분류한다."""
        request_id = inputs.get("message_uuid", "")
        prompt = inputs.get("prompt", "")
        sampling_params = get_router_sampling_params(tokenizer_2)
        result_generator = llm_engine_2.generate(prompt=prompt, sampling_params=sampling_params, request_id=request_id)

        async for request_output in result_generator:
            if request_output.outputs:
                result = request_output.outputs[0].text
            
            if request_output.finished:
                break

        return result

    router_chain = (
        RunnableParallel(
            prompt=make_prompt_route,
            message_uuid=lambda x: x["message_uuid"]
        )
        | RunnableLambda(call_vllm_engine_router)
    )

    return router_chain


def stream_chosen_response_vllm(llm_engine_1, llm_engine_2, tokenizer_1, tokenizer_2, question_type, prompt_type="chosen"):
    """
    Langchain LCEL을 사용하여 vLLM 스트리밍 체인을 구성합니다.
        llm_engine: vllm을 통한 llm 모델 서빙 엔진
        tokenizer: llm에 알맞은 tokenizer
        prompt_type: chosen
    """

    def build_prompt_with_qwen_template(user_info: dict) -> str:
        """
        user_info 딕셔너리를 받아 Chat Template을 적용한 최종 프롬프트를 생성합니다.
            x: {
                "service_prompt": str
                "question" : str,
                "history": str,
                "personal_prompt": str
            }
        """
        # 입력 데이터 타입 강제 변환 및 기본값 설정
        service_prompt = str(user_info.get("service_prompt", ""))
        question = str(user_info.get("question", ""))
        history = str(user_info.get("history", ""))
        personal_prompt = str(user_info.get("personal_prompt", ""))

        system_prompt = (
            service_prompt + 
            "\n---\n[사용자 지침]\n" + personal_prompt + 
            "\n\n[History]\n" + history + 
            "\n"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]

        return tokenizer_1.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            tools=get_tool_definitions()
        )
    
    def build_prompt_with_midm_template(user_info: dict) -> str:
        """
        user_info 딕셔너리를 받아 Chat Template을 적용한 최종 프롬프트를 생성합니다.
            x: {
                "service_prompt": str
                "question" : str,
                "history": str,
                "personal_prompt": str
            }
        """
        # 입력 데이터 타입 강제 변환 및 기본값 설정
        service_prompt = str(user_info.get("service_prompt", ""))
        question = str(user_info.get("question", ""))
        history = str(user_info.get("history", ""))
        personal_prompt = str(user_info.get("personal_prompt", ""))

        system_prompt = (
            basic_prompt +
            "\n\n" + service_prompt + 
            "\n---\n[사용자 지침]\n" + personal_prompt + 
            "\n\n[History]\n" + history + 
            "\n"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]

        return tokenizer_2.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            tools=get_tool_definitions()
        )
    
    make_prompt_qwen = RunnableLambda(build_prompt_with_qwen_template)

    make_prompt_midm = RunnableLambda(build_prompt_with_midm_template)

    async def call_vllm_engine_1(inputs: dict):
        """vLLM Qwen 엔진을 호출하여 비동기 스트리밍을 시작한다."""
        request_id = inputs.get("message_uuid", "")
        prompt = inputs.get("prompt", "")
        sampling_params = get_sampling_params(prompt_type, question_type)
        result_generator = llm_engine_1.generate(prompt=prompt, sampling_params=sampling_params, request_id=request_id)

        full_response = ""
        sent_length = 0    # 이미 전송한 길이 추적하기
        in_tool_call = False    # tool_call 태그 내부인지 추적하기

        async for request_output in result_generator:
            for completion in request_output.outputs:
                new_text = completion.text

                if new_text:
                    full_response += new_text
                    
                    # 전송할 텍스트 처리
                    current_pos = sent_length

                    while current_pos < len(full_response):
                        if not in_tool_call:
                            # tool_call 시작 태그 찾기
                            tool_start = full_response.find("<tool_call>", current_pos)

                            if tool_start == -1:
                                # tool_call이 없으면 나머지 전부 전송하기
                                to_send = full_response[current_pos:]
                                if to_send:
                                    yield to_send
                                current_pos = len(full_response)

                            else:
                                # tool_call 이전까지만 전송
                                if tool_start > current_pos:
                                    to_send = full_response[current_pos:tool_start]
                                    if to_send:
                                        yield to_send

                                in_tool_call = True
                                current_pos = tool_start

                        else:
                            # tool_call 종료 태그 찾기
                            tool_end = full_response.find("</tool_call>", current_pos)

                            if tool_end == -1:
                                # 아직 종료 태그가 나오지 않았다면 댁;
                                break

                            else:
                                # tool_call 종료 태그 이후부터 다시 전송 시작
                                in_tool_call = False
                                current_pos = tool_end + len("</tool_call>")
                    
                    sent_length = current_pos

                    
            if request_output.finished:
                break
    
        # tool calling
        tool_calls = parse_qwen_tool_call(full_response)
        if tool_calls:
            for tool_call in tool_calls:
                result = execute_tool(tool_call["name"], tool_call["arguments"], request_id)
                yield result
    
    async def call_vllm_engine_2(inputs: dict):
        """vLLM Midm 엔진을 호출하여 비동기 스트리밍을 시작한다."""
        request_id = inputs.get("message_uuid", "")
        prompt = inputs.get("prompt", "")
        sampling_params = get_sampling_params(prompt_type, question_type)
        result_generator = llm_engine_2.generate(prompt=prompt, sampling_params=sampling_params, request_id=request_id)

        full_response = ""
        sent_length = 0    # 이미 전송한 길이 추적하기
        tool_used = False

        async for request_output in result_generator:
            for completion in request_output.outputs:
                new_text = completion.text

                if new_text:
                    full_response += new_text
                    
                    # <tool_call> 태그가 시작되었다면 더이상 전송하지 않기
                    if tool_used == False:
                        for char in ["<t", "<to", "<too", "<tool", "<tool_", "<tool_c"]:
                            if char in new_text:
                                tool_used = True
                                yield "TOOL_CALL"
                                sent_length = len(full_response) - len(new_text)    # 전송된 길이
                                to_send = full_response[sent_length:]
                                print(to_send)
                                if to_send not in ["<t", "<to", "<too", "<tool", "<tool_", "<tool_c"]:
                                    yield to_send
                                break
                        else:
                            yield new_text

                    
            if request_output.finished:
                break
            
        # tool calling
        tool_calls = parse_midm_tool_call(full_response)
        if tool_calls:
            for tool_call in tool_calls:
                result = execute_tool(tool_call["name"], tool_call["arguments"], request_id)
                yield result

    if question_type in ["code", "algorithm", "math"]:        
        qwen_chain = (
            RunnableParallel(
                prompt=make_prompt_qwen,
                message_uuid=lambda x: x["message_uuid"]
            )
            | RunnableLambda(call_vllm_engine_1)
        )
        return qwen_chain

    elif question_type in ["ssafy", "general"]:
        midm_chain = (
            RunnableParallel(
                prompt=make_prompt_midm,
                message_uuid=lambda x: x["message_uuid"]
            )
            | RunnableLambda(call_vllm_engine_2)
        )

        return midm_chain

    else:
        # 예상하지 못한 타입의 경우 기본값으로 general 처리
        print(f"⚠️ Unknown question_type: {question_type}, defaulting to general")
        midm_chain = (
            RunnableParallel(
                prompt=make_prompt_midm,
                message_uuid=lambda x: x["message_uuid"]
            )
            | RunnableLambda(call_vllm_engine_2)
        )
        return midm_chain


def generate_rejected_response_vllm(llm_engine_1, llm_engine_2, tokenizer_1, tokenizer_2, question_type, prompt_type="rejected"):
    """
    Langchain LCEL을 사용하여 vLLM 스트리밍 체인을 구성합니다.
        llm_engine: vllm을 통한 llm 모델 서빙 엔진
        tokenizer: llm에 알맞은 tokenizer
        prompt_type: rejected
    """
    def build_prompt_with_qwen_template(user_info: dict) -> str:
        """
        user_info 딕셔너리를 받아 Chat Template을 적용한 최종 프롬프트를 생성합니다.
            x: {
                "service_prompt": str
                "question" : str,
                "history": str,
                "personal_prompt": str
            }
        """
        # 입력 데이터 타입 강제 변환 및 기본값 설정
        service_prompt = str(user_info.get("service_prompt", ""))
        question = str(user_info.get("question", ""))
        history = str(user_info.get("history", ""))
        personal_prompt = str(user_info.get("personal_prompt", ""))

        system_prompt = (
            service_prompt + 
            "\n---\n[사용자 지침]\n" + personal_prompt + 
            "\n\n[History]\n" + history + 
            "\n"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]

        return tokenizer_1.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

    def build_prompt_with_midm_template(user_info: dict) -> str:
        """
        user_info 딕셔너리를 받아 Chat Template을 적용한 최종 프롬프트를 생성합니다.
            x: {
                "service_prompt": str
                "question" : str,
                "history": str,
                "personal_prompt": str
            }
        """
        # 입력 데이터 타입 강제 변환 및 기본값 설정
        service_prompt = str(user_info.get("service_prompt", ""))
        question = str(user_info.get("question", ""))
        history = str(user_info.get("history", ""))
        personal_prompt = str(user_info.get("personal_prompt", ""))

        system_prompt = (
            basic_prompt +
            service_prompt + 
            "\n---\n[사용자 지침]\n" + personal_prompt + 
            "\n\n[History]\n" + history + 
            "\n"
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]

        return tokenizer_2.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True
        )

    make_prompt_qwen = RunnableLambda(build_prompt_with_qwen_template)
    make_prompt_midm = RunnableLambda(build_prompt_with_midm_template)

    async def call_vllm_engine_1(inputs: dict):
        """vLLM Qwen 엔진을 호출하여 비선호 답변을 반환한다."""
        request_id = inputs.get("message_uuid", "")
        prompt = inputs.get("prompt", "")
        sampling_params = get_sampling_params(prompt_type, question_type)
        result_generator = llm_engine_1.generate(prompt=prompt, sampling_params=sampling_params, request_id=request_id)

        async for request_output in result_generator:
            if request_output.outputs:
                result = request_output.outputs[0].text
            
            if request_output.finished:
                break

        return result

    async def call_vllm_engine_2(inputs: dict):
        """vLLM Midm 엔진을 호출하여 비선호 답변을 반환한다."""
        request_id = inputs.get("message_uuid", "")
        prompt = inputs.get("prompt", "")
        sampling_params = get_sampling_params(prompt_type, question_type)
        result_generator = llm_engine_2.generate(prompt=prompt, sampling_params=sampling_params, request_id=request_id)

        async for request_output in result_generator:
            if request_output.outputs:
                result = request_output.outputs[0].text
            
            if request_output.finished:
                break

        return result

    if question_type in ["code", "algorithm", "math"]:        
        qwen_chain = (
            RunnableParallel(
                prompt=make_prompt_qwen,
                message_uuid=lambda x: x["message_uuid"]
            )
            | RunnableLambda(call_vllm_engine_1)
        )
        return qwen_chain

    elif question_type in ["ssafy", "general"]:
        midm_chain = (
            RunnableParallel(
                prompt=make_prompt_midm,
                message_uuid=lambda x: x["message_uuid"]
            )
            | RunnableLambda(call_vllm_engine_2)
        )

        return midm_chain

    else:
        # 예상하지 못한 타입의 경우 기본값으로 general 처리
        print(f"⚠️ Unknown question_type: {question_type}, defaulting to general")
        midm_chain = (
            RunnableParallel(
                prompt=make_prompt_midm,
                message_uuid=lambda x: x["message_uuid"]
            )
            | RunnableLambda(call_vllm_engine_2)
        )
        return midm_chain