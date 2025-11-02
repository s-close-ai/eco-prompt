package com.closeai.ecoprompt.sse.service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class SseService {

	private final Map<String, SseEmitter>  emitters = new ConcurrentHashMap<>();

	/**
	 * 메시지 UUID를 키로 가진 SSE 연결
	 * */
	public SseEmitter addEmitter(String messageUUID) {

		SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);	// SSE 연결 5분
		emitters.put(messageUUID, emitter);
		emitter.onCompletion(() -> emitters.remove(messageUUID));
		emitter.onTimeout(() -> emitters.remove(messageUUID));
		emitter.onError((e) -> emitters.remove(messageUUID));

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
				sendEventToClient(messageUUID, "SSE_COMPLETE", "DONE");
			}catch(Exception e){
				emitter.completeWithError(e);
			}
			emitter.complete();
		}
	}
}
