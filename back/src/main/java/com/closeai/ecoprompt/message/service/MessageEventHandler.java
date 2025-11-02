package com.closeai.ecoprompt.message.service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.dto.response.InputJudgeResponse;
import com.closeai.ecoprompt.ai.model.dto.ScoreInfo;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.LlmModelCompleteEvent;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;
import com.closeai.ecoprompt.mileage.service.MileageService;
import com.closeai.ecoprompt.score.service.ScoreService;
import com.closeai.ecoprompt.sse.service.SseService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageEventHandler {

	// Key: messageUUID, Value: {"JUDGE", "LLM"}
	private final ConcurrentHashMap<String, Set<String>> completionStatus = new ConcurrentHashMap<>();

	private final ScoreService scoreService;
	private final ChattingService chattingService;
	private final MileageService mileageService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;
	private final SseService sseService;

	/**
	 * Judge 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@Transactional
	@EventListener
	public void handleJudgeModelComplete(JudgeModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		InputJudgeResponse judgeResponse = event.getJudgeResponse();
		ScoreInfo scoreInfo = judgeResponse.scoreInfo();
		String summary = judgeResponse.summary();

		// 1. Message의 점수 정보 Update
		MessageDocument messageToUpdate = updateMongoMessage(messageUUID, MessageSender.USER,null, scoreInfo, null);
		Message message = messageJpaRepository.findByMessageUUID(messageUUID)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		// 2. Message에 대한 점수 score 테이블에 insert
		scoreService.saveScore(message, scoreInfo);
		// 2-1. 점수에 따른 마일리지 저장
		mileageService.saveMileage(message, scoreInfo.getTotalScore());

		// 3. 새로 생성된 채팅방인 경우 채팅방의 이름을 첫 입력에 대한 요약 값으로 변경
		chattingService.setChattingTitle(messageToUpdate.getChattingId(), summary);

		// 4. TODO : 각 점수에 대한 전체 평균을 집계를 위해 REDIS 점수 저장

		// 5. 상태 관리
		checkCompletion(messageUUID,"JUDGE");
	}

	/**
	 * LLM 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@Transactional
	@EventListener
	public void LlmModelCompleteEvent(LlmModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		String llmAnswer = event.getLlmAnswer();

		// 2. AI 답변을 MongoDB에 저장
		updateMongoMessage(messageUUID, MessageSender.AI,llmAnswer, null, MessageStatus.COMPLETED);

		checkCompletion(messageUUID,"LLM");
	}

	/**
	 * 작업 완료 확인 함수 + 2개의 모델 호출 완료 후 SSE 연결 해제
	 * */
	private void checkCompletion(String messageUUID, String modelType) {

		// (스레드 안전) Set을 원자적으로 업데이트
		Set<String> completedSet = completionStatus.computeIfAbsent(messageUUID, k ->
			Collections.synchronizedSet(new HashSet<>())
		);

		completedSet.add(modelType);

		// 두 모델이 모두 완료되었는지 확인
		if (completedSet.size() == 2) {

			// 1. FE와의 SSE 연결을 '정상 종료'
			sseService.complete(messageUUID);

			// 2. 임시 저장소에서 제거
			completionStatus.remove(messageUUID);
		}
	}

	/**
	 * MongoDB의 MESSAGE 값 변경 함수
	 * */
	private MessageDocument updateMongoMessage(String messageUUID, MessageSender messageSender, String content, ScoreInfo scoreInfo, MessageStatus messageStatus) {

		MessageDocument messageToUpdate = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, messageSender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		if(content != null){
			messageToUpdate.updateContent(content);
		}
		if(scoreInfo != null){
			messageToUpdate.updateScoreInfo(scoreInfo);
		}
		if(messageStatus != null){
			messageToUpdate.updateMessageStatus(messageStatus);
		}

		messageMongoRepository.save(messageToUpdate);

		return messageToUpdate;
	}
}
