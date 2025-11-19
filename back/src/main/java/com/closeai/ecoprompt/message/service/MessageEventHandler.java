package com.closeai.ecoprompt.message.service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.closeai.ecoprompt.ai.model.event.EachModelErrorEvent;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.LlmModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.ModelCancelledEvent;
import com.closeai.ecoprompt.ai.model.event.ModelErrorEvent;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageEventHandler {

	// Key: messageUUID, Value: {"JUDGE", "LLM", "FILE_OCR"}
	private final ConcurrentHashMap<String, Set<String>> completionStatus = new ConcurrentHashMap<>();
	private final ConcurrentHashMap<String, Set<String>> expectedModels = new ConcurrentHashMap<>();

	private final MessageResultProcessorService messageResultService;
	private final SseService sseService;

	/**
	 * messageUUID 기준으로 완료해야 될 작업을 초기화하는 함수
	 * */
	public void initializeTask(String messageUUID, Set<String> modelsToExpect) {
		Set<String> concurrentExpected = ConcurrentHashMap.newKeySet();
		if (modelsToExpect != null) {
			concurrentExpected.addAll(modelsToExpect);
		}
		expectedModels.put(messageUUID, concurrentExpected);
		completionStatus.put(messageUUID, Collections.synchronizedSet(new HashSet<>()));
	}

	/**
	 * 현재 작업이 유효한지 판단
	 * */
	public boolean isTaskActive(String messageUUID) {
		return completionStatus.containsKey(messageUUID);
	}

	/**
	 * messageUUID 기준으로 작업을 추가하기 위한 함수
	 * */
	public void addExpectedTask(String messageUUID, String modelType) {

		Set<String> expectedTask = expectedModels.get(messageUUID);
		if (expectedTask != null) {
			expectedTask.add(modelType);
			AppLogger.info("작업이 추가됨");
		} else {
			AppLogger.warn("예상 작업 Set이 존재하지 않음");
		}
	}

	/**
	 * Judge 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@EventListener
	public void handleJudgeModelComplete(JudgeModelCompleteEvent event) {

		messageResultService.processJudgeCompletion(event);

		if (event.isSse()) {
			checkCompletion(event.getMessageUUID(), "JUDGE");
		}
	}

	/**
	 * LLM 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@EventListener
	public void LlmModelCompleteEvent(LlmModelCompleteEvent event) {

		messageResultService.processLLMCompletion(event);
		checkCompletion(event.getMessageUUID(), "LLM");
	}

	/**
	 * 각 모델에 대해서 답이 나오기 이전에 사용자가 정지 버튼 클릭 시 발생하는 이벤트
	 */
	@Async
	@EventListener
	public void ModelCancelledEvent(ModelCancelledEvent event) {

		MessageSender sender = event.getMessageSender();
		String messageUUID = event.getMessageUUID();

		messageResultService.processModelCancelled(event);

		if (sender.equals(MessageSender.AI)) {
			checkCompletion(messageUUID, "LLM");
		} else {
			checkCompletion(messageUUID, "JUDGE");
		}
	}

	/**
	 * 각 모델에 대해서 에러 발생 시 처리
	 */
	@Async
	@EventListener
	public void ModelErrorEvent(ModelErrorEvent event) {

		String messageUUID = event.getMessageUUID();

		messageResultService.processBothModelError(event);
		sseService.complete(messageUUID);

		checkCompletion(messageUUID, "JUDGE");
		checkCompletion(messageUUID, "LLM");
	}

	/**
	 * 각각의 모델 타입에 대해서 error 처리하는 함수
	 */
	@Async
	@EventListener
	public void EachModelErrorEvent(EachModelErrorEvent event) {

		messageResultService.processEachModelError(event);
		// sse 연결 했을 때만 완료 상태 확인
		if (event.isSse()) {
			if (event.getSender().equals(MessageSender.USER)) {
				checkCompletion(event.getMessageUUID(), "JUDGE");
			} else if (event.getSender().equals(MessageSender.AI)) {
				checkCompletion(event.getMessageUUID(), "LLM");
			}
		}
	}

	/**
	 * 작업 완료 확인 함수 + 2개의 모델 호출 완료 후 SSE 연결 해제
	 */
	public void checkCompletion(String messageUUID, String modelType) {

		// (스레드 안전) Set을 원자적으로 업데이트
		Set<String> completedSet = completionStatus.get(messageUUID);
		if (completedSet == null) {
			// initializeTask가 호출되기 전에 이벤트가 도착했거나, 이미 완료 처리된 작업
			AppLogger.warn("Completion set이 존재하지 않습니다. (이미 처리되었을 수 있음) UUID: " + messageUUID);
			return;
		}
		completedSet.add(modelType);

		Set<String> expectedSet = expectedModels.get(messageUUID);
		if (expectedSet == null) {
			AppLogger.error("Expected set이 존재하지 않습니다. (initializeTask 누락) UUID: " + messageUUID);
			// 에러 발생 시 임시 저장소에서 제거
			completionStatus.remove(messageUUID);
			return;
		}

		// 두 모델이 모두 완료되었는지 확인
		if (completedSet.containsAll(expectedSet)) {

			if (sseService.isCancelled(messageUUID)) {
				AppLogger.info("취소된 작업. UUID : " + messageUUID);
			} else {
				AppLogger.info("정상 완료. UUID : " + messageUUID);
				// 1. FE와의 SSE 연결을 '정상 종료'
				sseService.complete(messageUUID);
			}

			// 2. 임시 저장소에서 제거
			completionStatus.remove(messageUUID);
			expectedModels.remove(messageUUID);

			// 3. 취소 상태 정리
			sseService.cleanupCancelledTask(messageUUID);
		}
	}

}
