package com.closeai.ecoprompt.message.controller;

import org.springframework.http.ResponseEntity;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageRequestDto;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageResponseDto;

import io.swagger.v3.oas.annotations.Operation;

public interface MessageControllerDocs {

	@Operation(summary = "사용자 입력 후 AI 답변 SSE 구독 기능",
		description = "사용자 입력 후, 채팅방 ID값과, SSE 구독을 위한 메시지 UUID 값 전달")
	ResponseEntity<ApiResponse<SubmitMessageResponseDto>> submitMessage(SubmitMessageRequestDto request);


}
