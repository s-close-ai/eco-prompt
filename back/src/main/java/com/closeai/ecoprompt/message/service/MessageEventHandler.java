package com.closeai.ecoprompt.message.service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.event.EachModelEvent;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.LlmModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.ModelCancelledEvent;
import com.closeai.ecoprompt.ai.model.event.ModelErrorEvent;
import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;
import com.closeai.ecoprompt.mileage.service.MileageService;
import com.closeai.ecoprompt.score.service.ScoreService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageEventHandler {

	// Key: messageUUID, Value: {"JUDGE", "LLM"}
	private final ConcurrentHashMap<String, Set<String>> completionStatus = new ConcurrentHashMap<>();

	private final ScoreService scoreService;
	private final ChattingService chattingService;
	private final MileageService mileageService;
	private final SseService sseService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;

	/**
	 * Judge 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@Transactional
	@EventListener
	public void handleJudgeModelComplete(JudgeModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		ScoreInfo scoreInfo = event.getScoreInfo();
		String summary = event.getSummary();
		Integer userId = event.getUserId();

		// 1. Message의 점수 정보 Update
		MessageDocument messageToUpdate = updateMongoMessage(messageUUID, MessageSender.USER, null, scoreInfo,
			MessageStatus.COMPLETED);
		Message message = messageJpaRepository.findByMessageUUIDAndSenderType(messageUUID, MessageSender.USER)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		// 2. Message에 대한 점수 score 테이블에 있는지 없는지에 따라 save || update
		scoreService.saveOrUpdateScore(message, userId, scoreInfo);
		// 2-1. Mileage 테이블에 이미 있는지 없는지에 따라 save || update
		mileageService.saveOrUpdateMileage(message, userId, scoreInfo.totalScore());

		// 3. 새로 생성된 채팅방인 경우 채팅방의 이름을 첫 입력에 대한 요약 값으로 변경
		if (summary != null) {
			chattingService.setChattingTitle(messageToUpdate.getChattingId(), summary, userId);
		}

		// 4. 상태 관리
		checkCompletion(messageUUID, "JUDGE");
	}

	/**
	 * LLM 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@Transactional
	@EventListener
	public void LlmModelCompleteEvent(LlmModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		// 0. 사용자 메시지 업데이트
		MessageDocument userMessage = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
				MessageSender.USER)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		String llmAnswer = event.getLlmAnswer();
		String trainingAnswer = event.getTrainingAnswer();

		// 1. AI 답변을 MongoDB에 저장
		updateMongoMessage(messageUUID, MessageSender.AI, llmAnswer, null, MessageStatus.COMPLETED);
		// 1-2. 학습에 도움이 되는 답변을 MongoDB에 저장
		saveTraningMessage(messageUUID, trainingAnswer, userMessage.getChattingId());

		// 2. AI 답변 완료 상태 저장
		checkCompletion(messageUUID, "LLM");
	}

	/**
	 * 각 모델에 대해서 답이 나오기 이전에 사용자가 정지 버튼 클릭 시 발생하는 이벤트
	 */
	@Async
	@Transactional
	@EventListener
	public void ModelCancelledEvent(ModelCancelledEvent event) {

		String messageUUID = event.getMessageUUID();
		String content = event.getContent();
		MessageSender messageSender = event.getMessageSender();

		MessageDocument message = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, messageSender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다"));

		message.updateMessageStatus(MessageStatus.CANCELLED);
		// Judge Model 중지
		if (content != null) {
			message.updateContent(content);
		}

		messageMongoRepository.save(message);

		if (message.getSenderType() == MessageSender.AI) {
			checkCompletion(message.getMessageUUID(), "LLM");
		} else {
			checkCompletion(message.getMessageUUID(), "JUDGE");
		}
	}

	/**
	 * 각 모델에 대해서 에러 발생 시 처리
	 */
	@Async
	@Transactional
	@EventListener
	public void ModelErrorEvent(ModelErrorEvent event) {

		String messageUUID = event.getMessageUUID();

		sseService.complete(messageUUID);

		try {
			MessageDocument userDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
					MessageSender.USER)
				.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));
			MessageDocument aiDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
					MessageSender.AI)
				.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

			if (userDocument.getStatus() != MessageStatus.ERROR) {
				userDocument.updateMessageStatus(MessageStatus.ERROR);
				messageMongoRepository.save(userDocument);
			}
			if (aiDocument.getStatus() != MessageStatus.ERROR) {
				aiDocument.updateMessageStatus(MessageStatus.ERROR);
				messageMongoRepository.save(aiDocument);
			}
		} catch (BusinessException e) {
			AppLogger.warn("메시지 에러 처리 실패");
		}
		checkCompletion(messageUUID, "JUDGE");
		checkCompletion(messageUUID, "LLM");
	}

	/**
	 * 각각의 모델 타입에 대해서 error 처리하는 함수
	 */
	@Async
	@Transactional
	@EventListener
	public void EachModelErrorEvent(EachModelEvent event) {

		String messageUUID = event.getMessageUUID();
		MessageSender sender = event.getSender();

		// Judge 모델이 오류가 났을 때
		if (sender.equals(MessageSender.USER)) {

			MessageDocument userDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
					MessageSender.USER)
				.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

			if (userDocument.getStatus() != MessageStatus.ERROR) {
				userDocument.updateMessageStatus(MessageStatus.ERROR);
				messageMongoRepository.save(userDocument);
			}
			checkCompletion(messageUUID, "JUDGE");
		}
		// LLM 모델이 오류가 났을 때
		else if (sender.equals(MessageSender.AI)) {

			MessageDocument aiDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
					MessageSender.AI)
				.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

			if (aiDocument.getStatus() != MessageStatus.ERROR) {
				aiDocument.updateMessageStatus(MessageStatus.ERROR);
				messageMongoRepository.save(aiDocument);
			}

			checkCompletion(messageUUID, "LLM");
		}
	}

	/**
	 * 작업 완료 확인 함수 + 2개의 모델 호출 완료 후 SSE 연결 해제
	 */
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

			// 3. 취소 상태 정리
			sseService.cleanupCancelledTask(messageUUID);
		}
	}

	/**
	 * MongoDB의 MESSAGE 값 변경 함수
	 */
	private MessageDocument updateMongoMessage(String messageUUID, MessageSender messageSender, String content,
		ScoreInfo scoreInfo, MessageStatus messageStatus) {

		MessageDocument messageToUpdate = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
				messageSender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		if (content != null) {
			messageToUpdate.updateContent(content);
		}
		if (scoreInfo != null) {
			messageToUpdate.updateScoreInfo(scoreInfo);
		}
		if (messageStatus != null) {
			messageToUpdate.updateMessageStatus(messageStatus);
		}

		messageMongoRepository.save(messageToUpdate);

		return messageToUpdate;
	}

	private void saveTraningMessage(String messageUUID, String content, Long chattingId) {

		MessageDocument message = MessageDocument.builder()
			.messageUUID(messageUUID)
			.content(content)
			.chattingId(chattingId)
			.senderType(MessageSender.TRAINING)
			.status(MessageStatus.COMPLETED)
			.scoreInfo(null)
			.build();

		messageMongoRepository.save(message);
	}
}
