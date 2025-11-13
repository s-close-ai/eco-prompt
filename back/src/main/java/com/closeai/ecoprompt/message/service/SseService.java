package com.closeai.ecoprompt.message.service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.closeai.ecoprompt.common.logging.AppLogger;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SseService {

	private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();        // SSE 연결 저장 Map
	private final Map<String, AtomicBoolean> cancelledTasks = new ConcurrentHashMap<>();    // 답변 중단 SSE 저장
	private final Map<String, CompletableFuture<SseEmitter>> waitTasks = new ConcurrentHashMap<>();

	/**
	 * 메시지 UUID를 키로 가진 SSE 연결
	 * */
	public SseEmitter addEmitter(String messageUUID) {

		SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);    // SSE 연결 5분

		emitters.put(messageUUID, emitter);
		cancelledTasks.putIfAbsent(messageUUID, new AtomicBoolean(false));    // 해당 sse 연결 중으로 설정

		// SSE 연결하기 이전 사용자 답변 중지된 경우 SSE 연결 해지
		if (isCancelled(messageUUID)) {
			AppLogger.warn("사용자 답변 중지된 작업. UUID :  {}" + messageUUID);
			emitter.complete();
			getWaitStatue(messageUUID).complete(emitter);    // 연결 중지된 작업일 때 emitter 삭제
			return emitter;
		}

		emitter.onCompletion(() -> {
			AppLogger.debug("Emitter 완료. UUID :  {}" + messageUUID);
			emitters.remove(messageUUID);
			//cancelledTasks.remove(messageUUID);    // 작업 완료 시 제거
			waitTasks.remove(messageUUID);
		});
		emitter.onTimeout(() -> {
			AppLogger.warn("Emitter 시간 초과. UUID :  {}" + messageUUID);
			emitters.remove(messageUUID);
			//cancelledTasks.remove(messageUUID);    // 작업 완료 시 제거
			waitTasks.remove(messageUUID);
		});
		emitter.onError((e) -> {
			AppLogger.error(e.getMessage());
			emitters.remove(messageUUID);
			//cancelledTasks.remove(messageUUID);    // 작업 완료 시 제거
			waitTasks.remove(messageUUID);
		});

		// emitter가 준비되었음을 신호로 전송
		getWaitStatue(messageUUID).complete(emitter);
		return emitter;
	}

	/**
	 * SSE 이벤트 전송
	 * */
	public void sendEventToClient(String messageUUID, String eventName, Object data) {

		SseEmitter emitter = emitters.get(messageUUID);

		if (emitter != null) {
			try {
				emitter.send(SseEmitter.event()
					.name(eventName)
					.data(data));
			} catch (Exception e) {
				emitter.completeWithError(e);
				emitters.remove(messageUUID);
			}
		}
	}

	/**
	 * SSE 이벤트 종료 함수
	 * 마지막 종료 시 SSE_COMPLETE 이벤트 전달
	 * */
	public void complete(String messageUUID) {

		SseEmitter emitter = emitters.get(messageUUID);
		if (emitter != null) {
			try {
				sendEventToClient(messageUUID, "SSE_COMPLETE", "DONE");
			} catch (Exception e) {
				emitter.completeWithError(e);
			}
			emitter.complete();
		}
	}

	/**
	 * UUID 기준 해당 작업 중지 기록하는 함수
	 * */
	public void markAsCancelled(String messageUUID) {
		AtomicBoolean cancelled = cancelledTasks.computeIfAbsent(
			messageUUID, k -> new AtomicBoolean(false));
		cancelled.set(true);    // 작업 취소 되었다고 masking
	}

	/**
	 * UUID 기준 SSE가 연결 중지 되었는지 확인하는 함수
	 * */
	public boolean isCancelled(String messageUUID) {
		AtomicBoolean cancelled = cancelledTasks.get(messageUUID);
		return cancelled != null && cancelled.get();
	}

	public void cleanupCancelledTask(String messageUUID) {
		cancelledTasks.remove(messageUUID);
		AppLogger.debug("취소 상태 정리 완료. UUID : " + messageUUID);
	}

	/**
	 * Emitter가 준비될 때까지 기다리거나
	 * 이미 준비되었다면 즉시 반환하는 함수
	 * */
	public CompletableFuture<SseEmitter> getWaitStatue(String messageUUID) {
		return waitTasks.computeIfAbsent(messageUUID, k -> new CompletableFuture<>());
	}
}
