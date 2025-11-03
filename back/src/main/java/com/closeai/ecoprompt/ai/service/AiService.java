package com.closeai.ecoprompt.ai.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.closeai.ecoprompt.ai.model.dto.request.InputJudgeRequest;
import com.closeai.ecoprompt.ai.model.dto.response.InputJudgeResponse;
import com.closeai.ecoprompt.ai.model.dto.request.LlmRequest;
import com.closeai.ecoprompt.ai.model.dto.response.LlmResponse;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.LlmModelCompleteEvent;
import com.closeai.ecoprompt.sse.service.SseService;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@Service
public class AiService {

	private final ApplicationEventPublisher eventPublisher;

	private final WebClient judgePromptClient;
	private final WebClient llmClient;
	private final WebClient judgeLlmClient;

	private final UserInfoService userInfoService;
	private final SseService sseService;

	@Autowired
	public AiService(
		ApplicationEventPublisher eventPublisher,
		@Qualifier("judgePrompt") WebClient judgePromptClient,
		@Qualifier("llm") WebClient llmClient,
		@Qualifier("judgeLlm") WebClient judgeLlmClient,
		UserInfoService userInfoService,
		SseService sseService
	){
		this.eventPublisher = eventPublisher;
		this.judgePromptClient = judgePromptClient;
		this.llmClient = llmClient;
		this.judgeLlmClient = judgeLlmClient;
		this.userInfoService = userInfoService;
		this.sseService = sseService;
	}

	/**
	 * JudgePrompt Model 과 LLM 모델 호출 함수
	 * */
	@Async
	public void callAiModel(String messageUUID, String content, Integer userId){
		callInputJudgeModel(messageUUID, content);
		callLlmModel(messageUUID, content, userId);
	}

	/**
	 * JudgeModel 실행 완료 후 이벤트 생성 함수
	 * */
	@Async
	public void callInputJudgeModel(String messageUUID, String content){

		InputJudgeRequest request = new InputJudgeRequest(messageUUID, content);

		runInputJudgeModel(request)
			.doOnSuccess(judgeResponse -> {
				sseService.sendEventToClient(messageUUID, "JUDGE_PROMPT", judgeResponse.scoreInfo());

				eventPublisher.publishEvent(
					new JudgeModelCompleteEvent(this, messageUUID, judgeResponse)
				);
			})
			.doOnError(error -> {
				log.error("답변 Judge 모델 호출 실패. UUID :  {}", messageUUID);
			})
			.subscribe();
	}

	/**
	 * LLM 실행 완료 후 이벤트 생성 함수
	 * */
	@Async
	public void callLlmModel(String messageUUID, String userInput, Integer userId){

		String personalPrompt = userInfoService.getPersonalPrompt(userId);
		LlmRequest request = new LlmRequest(personalPrompt, userInput, messageUUID);
		StringBuilder answer = new StringBuilder();
		runLlmModel(request)
			.doOnNext(llmResponse -> {
				sseService.sendEventToClient(messageUUID, "LLM_TOKEN", llmResponse);

				if(llmResponse != null){
					answer.append(llmResponse.token());
				}
			})
			.doOnError(error -> {
				log.error("llm 모델 스트리밍 오류. UUID : {}", messageUUID);
			})
			.doOnComplete(() -> {
				String finalAnswer = answer.toString();
				sseService.sendEventToClient(messageUUID, "END_LLM", "END");
				eventPublisher.publishEvent(
					new LlmModelCompleteEvent(this, messageUUID, finalAnswer)
				);
			})
			.subscribe();
	}

	/**
	 * JudgeModel 실행 함수
	 * */
	private Mono<InputJudgeResponse> runInputJudgeModel(InputJudgeRequest request){

		return judgePromptClient.post()
			.uri("/api/v1/ai/prompt-judge")
			.bodyValue(request)
			.retrieve()
			.bodyToMono(InputJudgeResponse.class);
	}

	/**
	 * LLM 실행 함수
	 * */
	private Flux<LlmResponse> runLlmModel(LlmRequest request){
		return llmClient.post()
			.uri("/api/v1/ai/prompt-response")
			.accept(MediaType.TEXT_EVENT_STREAM)
			.bodyValue(request)
			.retrieve()
			.bodyToFlux(LlmResponse.class);
	}

	/**
	 * trainingJudge 모델 health check 함수
	 * */
	public Mono<String> runTrainingJudgeModel(){
		return judgeLlmClient.get()
			.uri("/health")
			.retrieve()
			.bodyToMono(String.class);
	}
}
