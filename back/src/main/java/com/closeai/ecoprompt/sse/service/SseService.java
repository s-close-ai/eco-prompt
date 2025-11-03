package com.closeai.ecoprompt.sse.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SseService {

	private final Map<String, SseEmitter>  emitters = new ConcurrentHashMap<>();
	private final Map<String, Boolean> cancelledTasks = new ConcurrentHashMap<>();

	/**
	 * 메시지 UUID를 키로 가진 SSE 연결
	 * */
	public SseEmitter addEmitter(String messageUUID) {

		SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);	// SSE 연결 5분

		emitters.put(messageUUID, emitter);
		cancelledTasks.putIfAbsent(messageUUID, false);	// 해당 sse 연결 중으로 설정

		// SSE 연결하기 이전 사용자 답변 중지된 경우 SSE 연결 해지
		if(isCancelled(messageUUID)){
			log.warn("사용자 답변 중지된 작업. UUID :  {}", messageUUID);
			emitter.complete();
			return emitter;
		}
		
		emitter.onCompletion(() -> {
			log.debug("Emitter 완료. UUID :  {}", messageUUID);
			emitters.remove(messageUUID);
			cancelledTasks.remove(messageUUID);	// 작업 완료 시 제거
		});
		emitter.onTimeout(() -> {
			log.warn("Emitter 시간 초과. UUID :  {}", messageUUID);
			emitters.remove(messageUUID);
			cancelledTasks.remove(messageUUID);	// 작업 완료 시 제거
		});
		emitter.onError((e) -> {
			log.error(e.getMessage());
			emitters.remove(messageUUID);
			cancelledTasks.remove(messageUUID);	// 작업 완료 시 제거
		});

		return emitter;
	}
	
	/**
	 * SSE 이벤트 전송
	 * */
	public void sendEventToClient(String messageUUID, String eventName, Object data){

		SseEmitter emitter = emitters.get(messageUUID);

		if(emitter != null){
			try{
				emitter.send(SseEmitter.event()
					.name(eventName)
					.data(data));
			} catch(Exception e){
				emitter.completeWithError(e);
				emitters.remove(messageUUID);
			}
		}
	}

	/**
	 * SSE 이벤트 종료 함수
	 * 마지막 종료 시 SSE_COMPLETE 이벤트 전달
	 * */
	public void complete(String messageUUID){

		SseEmitter emitter = emitters.get(messageUUID);

		if(emitter!= null){
			try{
				if(!cancelledTasks.containsKey(messageUUID)){
					sendEventToClient(messageUUID, "SSE_COMPLETE", "DONE");
				}
			}catch(Exception e){
				emitter.completeWithError(e);
			}
			emitter.complete();
			emitters.remove(messageUUID);
		}
	}

	/**
	 * UUID 기준 해당 작업 중지 기록하는 함수
	 * */
	public void markAsCancelled(String messageUUID){
		cancelledTasks.put(messageUUID, true);	// 작업 취소 되었다고 masking
	}
	
	/**
	 * UUID 기준 SSE가 연결 중지 되었는지 확인하는 함수
	 * */
	public boolean isCancelled(String messageUUID){
		Boolean cancelled = cancelledTasks.get(messageUUID);
		return cancelled != null && cancelled;
	}
}
