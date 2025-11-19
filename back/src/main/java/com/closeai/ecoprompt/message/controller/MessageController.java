package com.closeai.ecoprompt.message.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UpdateMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UploadFileRequest;
import com.closeai.ecoprompt.message.model.dto.response.JudgeOnlyResponse;
import com.closeai.ecoprompt.message.model.dto.response.SearchMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.UploadFileResponse;
import com.closeai.ecoprompt.message.service.FileService;
import com.closeai.ecoprompt.message.service.MessageService;
import com.closeai.ecoprompt.message.service.SseService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import reactor.core.publisher.Mono;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/messages")
public class MessageController implements MessageControllerDocs {

	private final MessageService messageService;
	private final SseService sseService;
	private final FileService fileService;

	@PostMapping(value = "/file-upload")
	public ResponseEntity<ApiResponse<UploadFileResponse>> makePresignedUrl(UploadFileRequest request) {

		return ApiResponse.success(fileService.makePresignedURL(request));
	}

	@PostMapping(value = "/input")
	public ResponseEntity<ApiResponse<SubmitMessageResponse>> submitMessage(
		@RequestBody @Valid SubmitMessageRequest request) {

		SubmitMessageResponse responseDto = messageService.submitMessage(request);

		return ApiResponse.success(responseDto);
	}

	@PreAuthorize("isAuthenticated()")
	@GetMapping(value = "/subscribe/{messageUUID}", produces = "text/event-stream")
	public SseEmitter subscribeSse(@PathVariable String messageUUID) {

		return sseService.addEmitter(messageUUID);
	}

	@PostMapping(value = "/stop/{messageUUID}")
	public ResponseEntity<ApiResponse<Void>> stopMessage(@PathVariable String messageUUID) {

		sseService.markAsCancelled(messageUUID);

		return ApiResponse.success(null);
	}

	@PatchMapping
	public ResponseEntity<ApiResponse<SubmitMessageResponse>> updateMessage(
		@RequestBody @Valid UpdateMessageRequest request) {

		SubmitMessageResponse response = messageService.updateMessage(request);

		return ApiResponse.success(response);
	}

	@GetMapping("/search")
	public ResponseEntity<ApiResponse<List<SearchMessageResponse>>> searchMessage(@RequestParam String keyword) {

		List<SearchMessageResponse> response = messageService.searchMessage(keyword);
		return ApiResponse.success(response);
	}

	@PatchMapping("/judge")
	public Mono<ResponseEntity<ApiResponse<JudgeOnlyResponse>>> callJudgePromptModel(
		@RequestBody @Valid UpdateMessageRequest request) {

		return messageService.updateJudgeResult(request)
			.map(ApiResponse::success);
	}

	@PatchMapping("/llm")
	public ResponseEntity<ApiResponse<Void>> callLlmModel(
		@RequestBody @Valid UpdateMessageRequest request) {

		messageService.updateLLMResult(request);
		return ApiResponse.success(null);
	}
}
