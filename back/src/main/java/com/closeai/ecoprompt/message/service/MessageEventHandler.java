package com.closeai.ecoprompt.message.service;

import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
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
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageEventHandler {

	// Key: messageUUID, Value: {"JUDGE", "LLM"}
	private final ConcurrentHashMap<String, Set<String>> completionStatus = new ConcurrentHashMap<>();
	private final ConcurrentHashMap<String, Set<String>> expectedModels = new ConcurrentHashMap<>();

	private final ScoreService scoreService;
	private final ChattingService chattingService;
	private final MileageService mileageService;
	private final SseService sseService;
	private final UserInfoService userInfoService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;

	public void initializeTask(String messageUUID, Set<String> modelsToExpect) {
		expectedModels.put(messageUUID, modelsToExpect);
		completionStatus.put(messageUUID, Collections.synchronizedSet(new HashSet<>()));
	}

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
		MessageDocument userMessage = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
				MessageSender.USER)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));
		MessageStatus preStatus = userMessage.getStatus();

		MessageDocument messageToUpdate = updateMongoMessage(messageUUID, MessageSender.USER, null, scoreInfo,
			MessageStatus.COMPLETED);
		Message message = messageJpaRepository.findByMessageUUIDAndSenderType(messageUUID, MessageSender.USER)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		// 2. Message에 대한 점수 score 테이블에 있는지 없는지에 따라 save || update
		scoreService.saveOrUpdateScore(message, userId, scoreInfo);
		// 2-1. Mileage 테이블에 이미 있는지 없는지에 따라 save || update
		mileageService.saveOrUpdateMileage(message, userId, scoreInfo.totalScore());
		// 2-2. 이전 메시지의 상태가 ERROR | CANCELED 이면 이전에 증가한 FAILCNT를 줄여야함
		if (preStatus.equals(MessageStatus.CANCELLED) || preStatus.equals(MessageStatus.ERROR)) {
			userInfoService.updateFailCnt(userId, -1);
		}

		// 3. 새로 생성된 채팅방인 경우 채팅방의 이름을 첫 입력에 대한 요약 값으로 변경
		if (summary != null) {
			chattingService.setChattingTitle(messageToUpdate.getChattingId(), summary, userId);
		}

		if (event.isSse()) {
			// 4. 상태 관리
			checkCompletion(messageUUID, "JUDGE");
		}
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
		saveTrainingMessage(messageUUID, trainingAnswer, userMessage.getChattingId());

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
		Integer userId = event.getUserId();
		MessageSender messageSender = event.getMessageSender();

		MessageDocument message = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, messageSender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다"));

		MessageStatus preStatus = message.getStatus();

		message.updateMessageStatus(MessageStatus.CANCELLED);
		// Judge Model 중지 시 답변이 오던 것까지 저장하기
		if (content != null) {
			message.updateContent(content);
		}
		messageMongoRepository.save(message);

		// 이전에 User의 점수가 ERROR, CANCELLED가 아닌경우 취소 PROMPT CNT 저장
		if (messageSender.equals(MessageSender.USER)
			&& !preStatus.equals(MessageStatus.ERROR)
			&& !preStatus.equals(MessageStatus.CANCELLED)) {
			userInfoService.updateFailCnt(userId, 1);
		}

		if (message.getSenderType() == MessageSender.AI) {
			updateMongoMessage(messageUUID, MessageSender.TRAINING, null, null, MessageStatus.CANCELLED);
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
		Integer userId = event.getUserId();

		MessageDocument message = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, sender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		MessageStatus preStatus = message.getStatus();

		// Judge 모델이 오류가 났을 때
		if (sender.equals(MessageSender.USER)) {

			message.updateMessageStatus(MessageStatus.ERROR);

			if (!preStatus.equals(MessageStatus.ERROR) && !preStatus.equals(MessageStatus.CANCELLED)) {
				userInfoService.updateFailCnt(userId, 1);
			}

			messageMongoRepository.save(message);
		}

		// LLM 모델이 오류가 났을 때 : 이전에 저장된 TRAINING 데이터를 NULL로 SETTING
		else if (sender.equals(MessageSender.AI)) {
			message.updateMessageStatus(MessageStatus.ERROR);
			messageMongoRepository.save(message);

			updateMongoMessage(messageUUID, MessageSender.TRAINING, null, null, MessageStatus.ERROR);
		}

		// 기존의 로직은 동일하지만 sse 연결 했을 때만 완료 상태 확인
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
	private void checkCompletion(String messageUUID, String modelType) {

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

	/**
	 * MongoDB의 MESSAGE 값 변경 함수
	 */
	private MessageDocument updateMongoMessage(String messageUUID, MessageSender messageSender, String content,
		ScoreInfo scoreInfo, MessageStatus messageStatus) {

		Optional<MessageDocument> messageToUpdateOpt = messageMongoRepository.findByMessageUUIDAndSenderType(
			messageUUID,
			messageSender);

		if (messageToUpdateOpt.isEmpty()) {
			if (messageSender.equals(MessageSender.USER) || messageSender.equals(MessageSender.AI)) {
				throw new BusinessException("메시지를 찾을 수 없습니다.");
			}
			return null;
		}

		MessageDocument messageToUpdate = messageToUpdateOpt.get();

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

	/**
	 * 학습 데이터 저장하는 함수
	 * */
	private void saveTrainingMessage(String messageUUID, String content, Long chattingId) {

		Optional<MessageDocument> existingMessageOpt = messageMongoRepository.findByMessageUUIDAndSenderType(
			messageUUID, MessageSender.TRAINING);

		// 2. ifPresentOrElse를 사용하여 분기 처리
		existingMessageOpt.ifPresentOrElse(
			// 2-1. [Update] 기존 메시지가 있는 경우
			existingMessage -> {
				// 요청한 대로 content와 status를 업데이트합니다.
				existingMessage.updateContent(content);
				existingMessage.updateMessageStatus(MessageStatus.COMPLETED);
				// (기존 로직처럼 scoreInfo는 null로 초기화)
				existingMessage.updateScoreInfo(null);

				messageMongoRepository.save(existingMessage);
			},
			// 2-2. [Insert] 기존 메시지가 없는 경우 (원래 로직)
			() -> {
				MessageDocument newMessage = MessageDocument.builder()
					.messageUUID(messageUUID)
					.content(content)
					.chattingId(chattingId)
					.senderType(MessageSender.TRAINING)
					.status(MessageStatus.COMPLETED)
					.scoreInfo(null)
					.build();

				messageMongoRepository.save(newMessage);
			}
		);
	}
}
