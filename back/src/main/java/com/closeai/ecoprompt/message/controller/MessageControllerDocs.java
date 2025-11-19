package com.closeai.ecoprompt.message.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UpdateMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UploadFileRequest;
import com.closeai.ecoprompt.message.model.dto.response.JudgeOnlyResponse;
import com.closeai.ecoprompt.message.model.dto.response.SearchMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.UploadFileResponse;

import io.swagger.v3.oas.annotations.Operation;
import reactor.core.publisher.Mono;

public interface MessageControllerDocs {

	@Operation(summary = "FILE S3 저장 presignedURL 생성 API")
	ResponseEntity<ApiResponse<UploadFileResponse>> makePresignedUrl(UploadFileRequest request);
	
	@Operation(summary = "사용자 입력 후 메시지 UUID 값 전달 API",
		description = "사용자 입력 후, 채팅방 ID값과, SSE 구독을 위한 메시지 UUID 값 전달")
	ResponseEntity<ApiResponse<SubmitMessageResponse>> submitMessage(SubmitMessageRequest request);

	@Operation(summary = "메시지에 대한 AI 답변 SSE 연결 구독 API",
		description = "SSE 연결은 각 메시지의 UUID를 path로 전달하여 연결한다.")
	SseEmitter subscribeSse(String messageUUID);

	@Operation(summary = "사용자가 메시지 응답 중지하는 API")
	ResponseEntity<ApiResponse<Void>> stopMessage(String messageUUID);

	@Operation(summary = "사용자가 메시지 수정하는 API")
	ResponseEntity<ApiResponse<SubmitMessageResponse>> updateMessage(UpdateMessageRequest request);

	@Operation(summary = "keyword로 사용자 메시지 검색하는 API")
	ResponseEntity<ApiResponse<List<SearchMessageResponse>>> searchMessage(String keyword);

	@Operation(summary = "Judge 모델만 따로 실행하는 API",
		description = "Judge Model이 오류가 발생했을 때 해당 메시지의 Judge 모델만 다시 실행")
	Mono<ResponseEntity<ApiResponse<JudgeOnlyResponse>>> callJudgePromptModel(UpdateMessageRequest request);

	@Operation(summary = "LLM 모델만 따로 실행하는 API",
		description = "LLM 모델이 오류가 발생했을 때, 해당 메시지의 LLM 모델만 다시 실행")
	ResponseEntity<ApiResponse<Void>> callLlmModel(UpdateMessageRequest request);
}
