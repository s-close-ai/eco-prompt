package com.closeai.ecoprompt.ai.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.closeai.ecoprompt.ai.model.dto.InputJudgeRequestDto;
import com.closeai.ecoprompt.ai.model.dto.InputJudgeResponseDto;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;

import lombok.extern.slf4j.Slf4j;
import reactor.core.publisher.Mono;

@Slf4j
@Service
public class AiService {

	private final ApplicationEventPublisher eventPublisher;

	private final WebClient inputJudgeClient;
	private final WebClient llmClient;
	private final WebClient trainingJudgeClient;

	@Autowired
	public AiService(
		ApplicationEventPublisher eventPublisher,
		@Qualifier("inputJudge") WebClient inputJudgeClient,
		@Qualifier("llm") WebClient llmClient,
		@Qualifier("trainingJudge") WebClient trainingJudgeClient
	){
		this.eventPublisher = eventPublisher;
		this.inputJudgeClient = inputJudgeClient;
		this.llmClient = llmClient;
		this.trainingJudgeClient = trainingJudgeClient;
	}

	/**
	 * JudgeModel 실행 완료 후 이벤트 생성 함수
	 * */
	@Async("callInputJudgeModel")
	public void callInputJudgeModel(String messageUUID, String content){

		runInputJudgeModel(messageUUID, content)
			.doOnSuccess(judgeResponse -> {
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
	 * JudgeModel 실행 함수
	 * */
	private Mono<InputJudgeResponseDto> runInputJudgeModel(String messageUUID, String content){

		InputJudgeRequestDto request = new InputJudgeRequestDto(messageUUID, content);

		return inputJudgeClient.post()
			.uri("/api/v1/ai/prompt-judge")
			.bodyValue(request)
			.retrieve()
			.bodyToMono(InputJudgeResponseDto.class);
	}

	/**
	 * trainingJudge 모델 health check 함수
	 * */
	public Mono<String> runTrainingJudgeModel(){
		return trainingJudgeClient.get()
			.uri("/health")
			.retrieve()
			.bodyToMono(String.class);
	}

}
