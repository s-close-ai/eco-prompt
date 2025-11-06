package com.closeai.ecoprompt.chatting.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.response.GetMessageResponse;
import com.closeai.ecoprompt.message.service.MessageService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chattings")
public class ChattingController implements ChattingControllerDocs {

	private final MessageService messageService;

	@GetMapping("/{chattingId}/messages")
	public ResponseEntity<ApiResponse<Page<GetMessageResponse>>> getChattingMessages(@PathVariable Long chattingId,
		@RequestParam(required = false, defaultValue = "0") Integer page) {

		return ApiResponse.success(messageService.getMessages(chattingId, page));
	}
}
