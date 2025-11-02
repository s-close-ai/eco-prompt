package com.closeai.ecoprompt.message.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;

import io.swagger.v3.oas.annotations.Operation;

public interface MessageControllerDocs {

	@Operation(summary = "사용자 입력 후 메시지 UUID 값 전달 API",
		description = "사용자 입력 후, 채팅방 ID값과, SSE 구독을 위한 메시지 UUID 값 전달")
	ResponseEntity<ApiResponse<SubmitMessageResponse>> submitMessage(SubmitMessageRequest request);

	@Operation(summary="메시지에 대한 AI 답변 SSE 연결 구독 API",
		description = "SSE 연결은 각 메시지의 UUID를 path로 전달하여 연결한다.")
	SseEmitter subscribeSse(String messageUUID);

	@Operation(summary = "사용자가 메시지 응답 중지하는 API")
	ResponseEntity<ApiResponse<Void>> stopMessage(String messageUUID);
}
