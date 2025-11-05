package com.closeai.ecoprompt.message.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UpdateMessageRequest;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;
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
	public ResponseEntity<ApiResponse<SubmitMessageResponse>> submitMessage(@RequestBody @Valid SubmitMessageRequest request) {

		SubmitMessageResponse responseDto = messageService.submitMessage(request);

		return ApiResponse.success(responseDto);
	}

	@GetMapping(value = "/subscribe/{messageUUID}", produces = "text/event-stream")
	public SseEmitter subscribeSse(@PathVariable String messageUUID) {

		return sseService.addEmitter(messageUUID);
	}

	@PostMapping(value = "/stop/{messageUUID}")
	public ResponseEntity<ApiResponse<Void>> stopMessage(@PathVariable String messageUUID){

		sseService.markAsCancelled(messageUUID);

		sseService.complete(messageUUID);

		return ApiResponse.success(null);
	}

	@PatchMapping
	public ResponseEntity<ApiResponse<SubmitMessageResponse>> updateMessage(@RequestBody @Valid UpdateMessageRequest request) {

		SubmitMessageResponse response = messageService.updateMessage(request);

		return ApiResponse.success(response);
	}
}
