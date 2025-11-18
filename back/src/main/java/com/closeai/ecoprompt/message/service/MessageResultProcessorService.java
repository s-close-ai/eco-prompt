package com.closeai.ecoprompt.message.service;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.dto.response.LLMFileResponse;
import com.closeai.ecoprompt.ai.model.event.EachModelErrorEvent;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.LlmModelCompleteEvent;
import com.closeai.ecoprompt.ai.model.event.ModelCancelledEvent;
import com.closeai.ecoprompt.ai.model.event.ModelErrorEvent;
import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
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
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MessageResultProcessorService {

	private final ScoreService scoreService;
	private final ChattingService chattingService;
	private final MileageService mileageService;
	private final UserInfoService userInfoService;
	private final FileService fileService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;

	/**
	 * Judge 모델이 성공했을 때 잓업
	 */
	@Transactional
	public void processJudgeCompletion(JudgeModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		ScoreInfo scoreInfo = event.getScoreInfo();
		String summary = event.getSummary();
		Integer userId = event.getUserId();

		//1. Message의 점수 정보 저장
		MessageDocument userMessage = getMessageDocument(messageUUID, MessageSender.USER);
		MessageStatus preStatus = userMessage.getStatus();

		updateMongoMessage(userMessage, null, scoreInfo, MessageStatus.COMPLETED);
		Message message = getMessage(messageUUID, MessageSender.USER);

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
			chattingService.setChattingTitle(userMessage.getChattingId(), summary, userId);
		}
	}

	/**
	 * LLM 모델 완료 했을 때 처리하는 함수
	 */
	@Transactional
	public void processLLMCompletion(LlmModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		MessageDocument aiMessage = getMessageDocument(messageUUID, MessageSender.AI);

		LLMFileResponse llmFileResponse = event.getLlmFileResponse();
		String llmAnswer = event.getLlmAnswer();
		String trainingAnswer = event.getTrainingAnswer();

		// 1. AI 답변을 MongoDB에 저장
		updateMongoMessage(aiMessage, llmAnswer, null, MessageStatus.COMPLETED);
		// 2. 학습에 도움이 되는 답변을 MongoDB에 저장
		saveTrainingMessage(messageUUID, trainingAnswer, aiMessage.getChattingId());
		// 3. 파일 정보가 있는 경우 파일 저장
		if (llmFileResponse != null) {
			fileService.saveFileDB(messageUUID, llmFileResponse.originalFileName(), llmFileResponse.savedFileName(),
				"application/pdf", MessageSender.AI);
		}
	}

	/**
	 * 모델 취소를 했을 때 DB 처리하는 함수
	 */
	@Transactional
	public void processModelCancelled(ModelCancelledEvent event) {

		String messageUUID = event.getMessageUUID();
		String content = event.getContent();
		Integer userId = event.getUserId();
		MessageSender sender = event.getMessageSender();

		MessageDocument messageDocument = getMessageDocument(messageUUID, sender);
		MessageStatus preStatus = messageDocument.getStatus();

		messageDocument.updateMessageStatus(MessageStatus.CANCELLED);

		if (content != null) {
			messageDocument.updateContent(content);
			messageMongoRepository.save(messageDocument);
		}

		// 이전에 User의 점수가 ERROR, CANCELLED가 아닌경우 취소 PROMPT CNT 저장
		if (sender.equals(MessageSender.USER)
			&& !preStatus.equals(MessageStatus.ERROR)
			&& !preStatus.equals(MessageStatus.CANCELLED)) {
			userInfoService.updateFailCnt(userId, 1);
		}

		if (sender.equals(MessageSender.AI)) {
			MessageDocument trainingDocument = getMessageDocument(messageUUID, MessageSender.TRAINING);
			updateMongoMessage(trainingDocument, null, null, MessageStatus.CANCELLED);
			LLMFileResponse llmFileResponse = event.getLlmFileResponse();
			// 3. 파일 정보가 있는 경우 파일 저장
			if (llmFileResponse != null) {
				fileService.saveFileDB(messageUUID, llmFileResponse.originalFileName(), llmFileResponse.savedFileName(),
					"application/pdf", MessageSender.AI);
			}
		}
	}

	/**
	 * 각 모델에 대해서 에러 처리
	 */
	@Transactional
	public void processEachModelError(EachModelErrorEvent event) {

		String messageUUID = event.getMessageUUID();
		MessageSender sender = event.getSender();
		Integer userId = event.getUserId();

		MessageDocument messageDocument = getMessageDocument(messageUUID, sender);
		MessageStatus preStatus = messageDocument.getStatus();

		// Judge 모델이 오류가 났을 때
		if (sender.equals(MessageSender.USER)) {
			messageDocument.updateMessageStatus(MessageStatus.ERROR);
			if (!preStatus.equals(MessageStatus.ERROR) && !preStatus.equals(MessageStatus.CANCELLED)) {
				userInfoService.updateFailCnt(userId, 1);
			}
			messageMongoRepository.save(messageDocument);
		}
		// LLM 모델이 오류가 났을 때 : 이전에 저장된 TRAINING 데이터를 NULL로 SETTING
		else if (sender.equals(MessageSender.AI)) {
			messageDocument.updateMessageStatus(MessageStatus.ERROR);
			messageMongoRepository.save(messageDocument);

			MessageDocument trainingDocument = getMessageDocument(messageUUID, MessageSender.TRAINING);
			updateMongoMessage(trainingDocument, null, null, MessageStatus.ERROR);
		}
	}

	/**
	 * 2개의 모델 동시에 ERROR 처리
	 */
	public void processBothModelError(ModelErrorEvent event) {

		String messageUUID = event.getMessageUUID();

		MessageDocument userDocument = getMessageDocument(messageUUID, MessageSender.USER);
		MessageDocument aiDocument = getMessageDocument(messageUUID, MessageSender.AI);

		if (userDocument.getStatus() != MessageStatus.ERROR) {
			userDocument.updateMessageStatus(MessageStatus.ERROR);
			messageMongoRepository.save(userDocument);
		}
		if (aiDocument.getStatus() != MessageStatus.ERROR) {
			aiDocument.updateMessageStatus(MessageStatus.ERROR);
			messageMongoRepository.save(aiDocument);
		}
	}

	private MessageDocument getMessageDocument(String messageUUID, MessageSender sender) {
		return messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, sender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));
	}

	private Message getMessage(String messageUUID, MessageSender sender) {
		return messageJpaRepository.findByMessageUUIDAndSenderType(messageUUID, sender)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));
	}

	/**
	 * MongoDB의 MESSAGE 값 변경 함수
	 */
	private void updateMongoMessage(MessageDocument messageToUpdate, String content,
		ScoreInfo scoreInfo, MessageStatus messageStatus) {

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
	}

	/**
	 * 학습 데이터 저장하는 함수
	 */
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
