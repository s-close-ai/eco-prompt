package com.closeai.ecoprompt.message.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageRequestDto;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageResponseDto;
import com.closeai.ecoprompt.message.service.MessageService;
import com.closeai.ecoprompt.sse.service.SseService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/messages")
public class MessageController implements MessageControllerDocs{

	private final MessageService messageService;
	private final SseService sseService;

	@PostMapping("/input")
	public ResponseEntity<ApiResponse<SubmitMessageResponseDto>> submitMessage(@RequestBody @Valid SubmitMessageRequestDto request) {

		SubmitMessageResponseDto responseDto = messageService.submitMessage(request);
		return ApiResponse.success(responseDto);
	}

	@GetMapping(value = "/subscribe/{messageUUID}", produces = "text/event-stream")
	public SseEmitter subscribeSse(@PathVariable String messageUUID) {

		return sseService.addEmitter(messageUUID);
	}
}
