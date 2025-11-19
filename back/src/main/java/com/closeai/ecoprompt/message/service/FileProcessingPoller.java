package com.closeai.ecoprompt.message.service;

import static org.springframework.data.mongodb.core.query.Criteria.*;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.closeai.ecoprompt.ai.model.event.EachModelErrorEvent;
import com.closeai.ecoprompt.ai.service.AiService;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.model.entity.FileEvent;
import com.closeai.ecoprompt.message.model.entity.FileEventStatus;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileProcessingPoller {

	private final MongoTemplate mongoTemplate;
	private final MessageEventHandler messageEventHandler;
	private final ApplicationEventPublisher eventPublisher;
	private final AiService aiService;

	/**
	 * OCR을 성공한 PYTHON 작업을 확인하는 함수
	 * */
	@Scheduled(fixedDelay = 5000)
	public void pollForCompletedOcrJobs() {

		// 1. "COMPLETE" 상태인 작업을 찾고 상태 변경
		Query query = new Query(where("status").is(FileEventStatus.COMPLETED));
		Update update = new Update().set("status", FileEventStatus.LLM_PENDING);

		FileEvent job = mongoTemplate.findAndModify(query, update, FileEvent.class, "file_events");

		// 2. 작업에 성공했을 때 LLM 호출
		if (job != null) {
			String messageUUID = job.getMessageUUID();

			AppLogger.info("파일 처리 완료. LLM 호출 시작. messageUUID: " + job.getMessageUUID());
			// 2-1. LLM의 작업 추가
			messageEventHandler.addExpectedTask(messageUUID, "LLM");
			// 2-2. OCR 작업 완료 처리
			messageEventHandler.checkCompletion(messageUUID, "FILE_OCR");
			// 2-3. LLM 모델 호출
			aiService.callLlmModel(messageUUID, job.getFinalPrompt(), job.getUserId());
		}
	}

	@Scheduled(fixedDelay = 5000)
	public void pollForErrorOcrJobs() {

		Query query = new Query(where("status").is(FileEventStatus.ERROR));
		Update update = new Update().set("status", FileEventStatus.ERROR);
		FileEvent job = mongoTemplate.findAndModify(query, update, FileEvent.class, "fileEvent");

		if (job != null) {
			String messageUUID = job.getMessageUUID();
			Integer userId = job.getUserId();

			AppLogger.error("OCR FAIL 감지. messageUUID: " + messageUUID);

			eventPublisher.publishEvent(
				new EachModelErrorEvent(this, messageUUID, MessageSender.AI, userId, false)
			);

			messageEventHandler.checkCompletion(messageUUID, "FILE_OCR");
		}
	}
}
