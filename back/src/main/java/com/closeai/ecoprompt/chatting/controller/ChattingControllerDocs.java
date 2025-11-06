package com.closeai.ecoprompt.chatting.controller;

import org.springframework.http.ResponseEntity;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.response.MessagePageResponse;

import io.swagger.v3.oas.annotations.Operation;

public interface ChattingControllerDocs {

	@Operation(summary = "채팅방 내부의 메시지들을 조회하는 API",
		description = "채팅방 메시지 내역은 최근 입력 기준 10개씩 조회가 됩니다.")
	ResponseEntity<ApiResponse<MessagePageResponse>> getChattingMessages(Long chattingId, Integer page);
}
