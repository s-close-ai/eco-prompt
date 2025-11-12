package com.closeai.ecoprompt.ai.service;

import java.util.concurrent.ConcurrentSkipListMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.closeai.ecoprompt.ai.model.dto.request.InputJudgeRequest;
import com.closeai.ecoprompt.ai.model.dto.request.LlmRequest;
import com.closeai.ecoprompt.ai.model.dto.response.InputJudgeResponse;
import com.closeai.ecoprompt.ai.model.dto.response.LlmResponse;
import com.closeai.ecoprompt.ai.model.event.EachModelEvent;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.LlmModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.ModelCancelledEvent;
import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.service.SseService;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

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
	) {
		this.eventPublisher = eventPublisher;
		this.judgePromptClient = judgePromptClient;
		this.llmClient = llmClient;
		this.judgeLlmClient = judgeLlmClient;
		this.userInfoService = userInfoService;
		this.sseService = sseService;
	}

	/**
	 * JudgePrompt Model 과 LLM 모델 호출 함수
	 */
	@Async
	public void callAiModel(String messageUUID, String content, Integer userId, boolean isFirstChatting) {

		if (sseService.isCancelled(messageUUID)) {
			AppLogger.info("AI 모델 호출 시작 이전에 이미 취소 되었습니다. UUID : " + messageUUID);
			return;
		}

		// AI 모델 호출 이전에 SSE 연결이 완료되었는지 확인
		// 만약에 호출 이전에 에러 확인 시 2개의 모델 모두 ERROR 처리하기
		// try {
		// 	sseService.getWaitStatue(messageUUID).get();
		// } catch (InterruptedException | ExecutionException e) {
		// 	AppLogger.error("SSE 연결 대기 중에 에러 발생. UUID : " + messageUUID);
		// 	eventPublisher.publishEvent(new ModelErrorEvent(this, messageUUID));
		// 	return;
		// }

		// SSE 연결 이후에 사용자가 취소를 한 경우 취소 상태를 저장
		if (sseService.isCancelled(messageUUID)) {
			AppLogger.info("AI 모델 호출 시작 이전에 이미 취소 되었습니다. UUID : " + messageUUID);
			sseService.sendEventToClient(messageUUID, "SSE_COMPLETE", "DONE");
			eventPublisher.publishEvent(
				new ModelCancelledEvent(this, messageUUID, null, MessageSender.USER)
			);
			eventPublisher.publishEvent(
				new ModelCancelledEvent(this, messageUUID, null, MessageSender.AI)
			);
			return;
		}

		callInputJudgeModel(messageUUID, content, userId, isFirstChatting);
		callLlmModel(messageUUID, content, userId);
	}

	/**
	 * JudgeModel 실행 완료 후 이벤트 생성 함수
	 * 사용자 취소 시 : 상태 값을 cancelled로 변경
	 * [응답 전에 취소] : score 점수를 저장하지 않음
	 * <p>
	 * 모델 에러 발생 시
	 * 상태값 : ERROR
	 * FE : JUDGE_ERROR 이벤트 발생
	 * SSE : 연결 해제
	 */
	@Async
	public void callInputJudgeModel(String messageUUID, String content, Integer userId, boolean isFirstChatting) {

		InputJudgeRequest request = new InputJudgeRequest(messageUUID, content);

		runInputJudgeModel(request)
			.doOnSuccess(judgeResponse -> {

				if (sseService.isCancelled(messageUUID)) {
					AppLogger.info("Judge 모델 완료 하였으나, 작업이 취소 되어 이벤트를 발행하지 않습니다.");
					eventPublisher.publishEvent(
						new ModelCancelledEvent(this, messageUUID, null, MessageSender.USER)
					);
					return;
				}

				ScoreInfo scoreInfo = new ScoreInfo(judgeResponse.totalScore(),
					judgeResponse.clarityScore(), judgeResponse.specificityScore(),
					judgeResponse.formatScore(), judgeResponse.safetyScore());
				String summary = null;

				sseService.sendEventToClient(messageUUID, "JUDGE_PROMPT", scoreInfo);
				if (isFirstChatting) {
					summary = judgeResponse.summary();
					sseService.sendEventToClient(messageUUID, "CHATTING_TITLE", summary);
				}

				sseService.sendEventToClient(messageUUID, "JUDGE_END", "DONE");

				eventPublisher.publishEvent(
					new JudgeModelCompleteEvent(this, messageUUID, userId, summary, scoreInfo)
				);
			})
			.doOnError(error -> {
				AppLogger.error("답변 Judge 모델 호출 실패. UUID :  " + messageUUID);
				sseService.sendEventToClient(messageUUID, "JUDGE_ERROR", "ERROR");
				eventPublisher.publishEvent(
					new EachModelEvent(this, messageUUID, MessageSender.USER)
				);
			})
			.subscribe();
	}

	/**
	 * LLM 실행 완료 후 이벤트 생성 함수
	 * 사용자 취소 시 : 상태 값을 cancelled로 변경
	 * [응답 전 취소] AI 응답 값을 저장하지 않음
	 * [응답 중 취소] AI가 지금까지 받은 응답을 저장함
	 * <p>
	 * 모델 에러 발생 시
	 * 상태 값 : ERROR
	 * FE : LLM_ERROR 이벤트 발생
	 * SSE : 연결 해제
	 */
	@Async
	public void callLlmModel(String messageUUID, String userInput, Integer userId) {

		String personalPrompt = userInfoService.getPersonalPrompt(userId);
		LlmRequest request = new LlmRequest(personalPrompt, userInput, messageUUID);

		StringBuilder answer = new StringBuilder();
		StringBuilder trainingAnswer = new StringBuilder();

		ConcurrentSkipListMap<Integer, String> buffer = new ConcurrentSkipListMap<>();    // seqId를 기준으로 정렬
		final AtomicInteger nextExpectedSeqId = new AtomicInteger(0);   // 시작 seqId는 0

		runLlmModel(request)
			.takeUntil(llmResponse -> sseService.isCancelled(messageUUID))
			.doOnNext(llmResponse -> {
				// SeqId 순선에 따라 StringBuilder에 Input
				if (llmResponse != null) {
					buffer.put(llmResponse.sequenceId(), llmResponse.token());

					while (buffer.containsKey(nextExpectedSeqId.get())) {
						int currentSeqId = nextExpectedSeqId.get();
						String token = buffer.remove(currentSeqId);

						if (currentSeqId == 0 && token.equals("START")) {
							sseService.sendEventToClient(messageUUID, "LLM_START", llmResponse);
						} else if (token.equals("DONE")) {

						} else if (currentSeqId > 0) {
							sseService.sendEventToClient(messageUUID, "LLM_TOKEN", llmResponse);
							answer.append(token);
						}

						nextExpectedSeqId.incrementAndGet();
					}
				}
			})
			.doOnError(error -> {
				AppLogger.error("llm 모델 스트리밍 오류. UUID : " + messageUUID);
				sseService.sendEventToClient(messageUUID, "LLM_ERROR", "ERROR");
				eventPublisher.publishEvent(
					new EachModelEvent(this, messageUUID, MessageSender.AI)
				);
			})
			.doOnComplete(() -> {

				if (buffer.containsKey(-1)) {
					String trainingToken = buffer.remove(-1);
					trainingAnswer.append(trainingToken);
				}

				String finalAnswer = answer.toString();
				String finalTrainingAnswer = trainingAnswer.toString();

				// SSE 연결이 끊기지 않고 완료된 경우에만 완료 메시지 전달
				if (!sseService.isCancelled(messageUUID)) {
					AppLogger.info("LLM 모델 답변 완료. UUID : " + messageUUID);

					if (!buffer.isEmpty()) {
						AppLogger.warn("LLM 완료 답변 완료. 하지만 버퍼에 값 있음");
					}

					sseService.sendEventToClient(messageUUID, "LLM_END", "DONE");

					eventPublisher.publishEvent(
						new LlmModelCompleteEvent(this, messageUUID, finalAnswer, finalTrainingAnswer)
					);
				} else {
					AppLogger.info("사용자에 의해서 답변이 중지되었습니다. UUID : " + messageUUID);

					sseService.sendEventToClient(messageUUID, "SSE_COMPLETE", "DONE");
					if (!finalAnswer.isEmpty()) {
						eventPublisher.publishEvent(
							new ModelCancelledEvent(this, messageUUID, finalAnswer, MessageSender.AI)
						);
					}
				}
			})
			.subscribe();
	}

	/**
	 * JudgeModel 실행 함수
	 */
	private Mono<InputJudgeResponse> runInputJudgeModel(InputJudgeRequest request) {

		return judgePromptClient.post()
			.uri("/prompt-judge")
			.bodyValue(request)
			.retrieve()
			.bodyToMono(InputJudgeResponse.class);
	}

	/**
	 * LLM 실행 함수
	 */
	private Flux<LlmResponse> runLlmModel(LlmRequest request) {
		return llmClient.post()
			.uri("/api/v1/ai/prompt-response")
			.accept(MediaType.TEXT_EVENT_STREAM)
			.bodyValue(request)
			.retrieve()
			.bodyToFlux(LlmResponse.class);
	}

	/**
	 * trainingJudge 모델 health check 함수
	 */
	public Mono<String> runTrainingJudgeModel() {
		return judgeLlmClient.get()
			.uri("/health")
			.retrieve()
			.bodyToMono(String.class);
	}
}
