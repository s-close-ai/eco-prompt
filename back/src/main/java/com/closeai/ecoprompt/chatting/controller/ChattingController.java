package com.closeai.ecoprompt.chatting.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.closeai.ecoprompt.chatting.model.dto.request.UpdateChattingProjectRequest;
import com.closeai.ecoprompt.chatting.model.dto.request.UpdateChattingTitleRequest;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.response.GetMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.MessagePageResponse;
import com.closeai.ecoprompt.message.service.MessageService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/chattings")
public class ChattingController implements ChattingControllerDocs {

	private final MessageService messageService;
	private final ChattingService chattingService;

	@GetMapping("/{chattingId}/messages")
	public ResponseEntity<ApiResponse<MessagePageResponse>> getChattingMessages(@PathVariable Long chattingId,
		@RequestParam(required = false, defaultValue = "0") Integer page) {

		Page<GetMessageResponse> messageResponse = messageService.getMessages(chattingId, page);

		return ApiResponse.success(MessagePageResponse.from(messageResponse));
	}

	@PatchMapping("/{chattingId}/title")
	public ResponseEntity<ApiResponse<Void>> updateChattingTitle(@PathVariable Long chattingId,
		@RequestBody @Valid UpdateChattingTitleRequest request) {

		String title = request.title();

		return ApiResponse.success(chattingService.setChattingTitle(chattingId, title));
	}

	@PatchMapping("/{chattingId}/project")
	public ResponseEntity<ApiResponse<Void>> updateChattingProject(@PathVariable Long chattingId,
		@RequestBody UpdateChattingProjectRequest request) {
		return ApiResponse.success(chattingService.updateChattingProject(chattingId, request));
	}

	@PatchMapping("/delete")
	public ResponseEntity<ApiResponse<Void>> deleteChatting(@RequestParam Long chattingId) {
		return ApiResponse.noContent(chattingService.deleteChatting(chattingId));
	}
}
