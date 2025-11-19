package com.closeai.ecoprompt.message.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

import org.springframework.scheduling.annotation.Scheduled;
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
	private final Map<String, List<SseEvent>> eventBuffer = new ConcurrentHashMap<>();    // sse 연결 이전에 발생한 event 저장
	private final Map<String, AtomicBoolean> bufferSending = new ConcurrentHashMap<>();        // 순서 보장용 buffer

	/**
	 * 메시지 UUID를 키로 가진 SSE 연결
	 * */
	public SseEmitter addEmitter(String messageUUID) {

		SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);    // SSE 연결 5분

		emitters.put(messageUUID, emitter);
		cancelledTasks.putIfAbsent(messageUUID, new AtomicBoolean(false));    // 해당 sse 연결 중으로 설정

		// 버퍼에 있는 이벤트 전송 중 다른 이벤트 전송 못하도록 플래그 설정
		AtomicBoolean sendingFlag = bufferSending.computeIfAbsent(messageUUID, k -> new AtomicBoolean(false));

		if (!sendingFlag.compareAndSet(false, true)) {
			AppLogger.warn("버퍼 전송 진행 중. UUID : " + messageUUID);
		}

		List<SseEvent> bufferedEvents = eventBuffer.remove(messageUUID);
		if (bufferedEvents != null && !bufferedEvents.isEmpty()) {
			AppLogger.info("버퍼에 저장된 이벤트 전송. 개수 : " + bufferedEvents.size());

			try {
				for (SseEvent event : bufferedEvents) {
					emitter.send(SseEmitter.event()
						.name(event.name)
						.data(event.data));
				}
			} catch (Exception e) {
				AppLogger.error("버퍼에 저장된 이벤트 전송 실패 : " + e.getMessage());
			}
		}

		// 버퍼 전송 완료 플래그 해제
		sendingFlag.set(false);
		bufferSending.remove(messageUUID);

		// SSE 연결하기 이전 사용자 답변 중지된 경우 SSE 연결 해지
		if (isCancelled(messageUUID)) {
			AppLogger.warn("사용자 답변 중지된 작업. UUID :  {}" + messageUUID);
			emitter.complete();
			getWaitStatue(messageUUID).complete(emitter);    // 연결 중지된 작업일 때 emitter 삭제
			return emitter;
		}

		emitter.onCompletion(() -> {
			AppLogger.debug("Emitter 완료. UUID :  {}" + messageUUID);
			cleanup(messageUUID);
		});
		emitter.onTimeout(() -> {
			AppLogger.warn("Emitter 시간 초과. UUID :  {}" + messageUUID);
			cleanup(messageUUID);
		});
		emitter.onError((e) -> {
			AppLogger.error(e.getMessage());
			cleanup(messageUUID);
		});

		// emitter가 준비되었음을 신호로 전송
		getWaitStatue(messageUUID).complete(emitter);
		return emitter;
	}

	/**
	 * SSE 이벤트 전송
	 * */
	public void sendEventToClient(String messageUUID, String eventName, Object data) {

		// 버퍼 전송 중이면 대기
		AtomicBoolean sendingFlag = bufferSending.get(messageUUID);
		if (sendingFlag != null && sendingFlag.get()) {
			int retryCount = 0;
			while (sendingFlag.get() && retryCount < 100) {    // 1초 정도 대기
				try {
					Thread.sleep(10);
					retryCount++;
				} catch (InterruptedException e) {
					Thread.currentThread().interrupt();
					break;
				}
			}
		}
		SseEmitter emitter = emitters.get(messageUUID);
		// 1. 이미 emiiter 가 있으면 즉시 전송
		if (emitter != null) {
			try {
				emitter.send(SseEmitter.event()
					.name(eventName)
					.data(data));
				return;
			} catch (Exception e) {
				emitter.completeWithError(e);
				return;
			}
		}

		// 2. emitter가 없으면 waitTasks 확인
		CompletableFuture<SseEmitter> future = waitTasks.get(messageUUID);

		// 2-1. waitTasks 가 없거나 아직 완료되지 않으면 버퍼에 저장
		if (future == null || !future.isDone()) {
			AppLogger.debug("SSE 연결 대기 중... UUID : " + messageUUID);
			eventBuffer.computeIfAbsent(messageUUID, k -> Collections.synchronizedList(new ArrayList<>()))
				.add(new SseEvent(eventName, data));
			return;
		}
		// 2-2. waitTasks는 완료되었는데 emitter가 없음. 즉, 연결 해제
		AppLogger.warn("SSE 연결 이미 종료됨. UUID : " + messageUUID);
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
				return;
			}
			emitter.complete();
		} else {
			CompletableFuture<SseEmitter> future = waitTasks.get(messageUUID);
			if (future == null || !future.isDone()) {
				AppLogger.warn("SSE 연결 이전 complete 호출. messageUUID : " + messageUUID);
				eventBuffer.computeIfAbsent(messageUUID, k -> Collections.synchronizedList(new ArrayList<>()))
					.add(new SseEvent("SSE_COMPLETE", "DONE"));
			} else {
				cleanup(messageUUID);
			}
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

	/**
	 * 리소스 정리
	 * */
	private void cleanup(String messageUUID) {
		emitters.remove(messageUUID);
		waitTasks.remove(messageUUID);
		eventBuffer.remove(messageUUID);
		bufferSending.remove(messageUUID);
	}

	/**
	 * 주기적으로 오래된 버퍼 정리
	 */
	@Scheduled(fixedDelay = 300000) // 5분마다
	public void cleanupOldBuffers() {
		eventBuffer.forEach((uuid, events) -> {
			CompletableFuture<SseEmitter> future = waitTasks.get(uuid);
			// Future가 완료됐는데 emitter가 없으면 정리
			if (future != null && future.isDone() && !emitters.containsKey(uuid)) {
				AppLogger.warn("오래된 버퍼 정리. UUID: " + uuid + ", 이벤트 수: " + events.size());
				cleanup(uuid);
				cancelledTasks.remove(uuid);
			}
		});
	}

	private record SseEvent(String name, Object data) {
	}
}
