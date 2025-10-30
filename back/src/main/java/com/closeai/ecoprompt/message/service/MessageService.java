package com.closeai.ecoprompt.message.service;

import java.util.UUID;

import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.dto.InputJudgeResponseDto;
import com.closeai.ecoprompt.ai.model.dto.ScoreInfo;
import com.closeai.ecoprompt.ai.model.event.JudgeModelCompleteEvent;
import com.closeai.ecoprompt.ai.service.AiService;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageRequestDto;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageResponseDto;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;
import com.closeai.ecoprompt.score.service.ScoreService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MessageService {

	private final AiService aiService;
	private final ChattingService chattingService;
	private final ScoreService scoreService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;
	
	/**
	 * 사용자 입력에 대한 API 처리 함수
	 * */
	@Transactional
	public SubmitMessageResponseDto submitMessage(SubmitMessageRequestDto messageCommand) {

		Integer projectId = messageCommand.getProjectId();
		Long chattingId = messageCommand.getChattingId();
		String content = messageCommand.getContent();

		//1. chattingID가 null인 경우 chatting 저장
		Chatting chatting = chattingService.getOrCreateChatting(chattingId, projectId);
		chattingId = chatting.getId();

		//2. message에 대한 UUID 값 생성
		String messageUUID = UUID.randomUUID().toString();

		//3. Mysql과 MonogoDB에 사용자 입력 메시지 저장
		saveMessage(messageUUID, chatting, MessageSender.USER, content, MessageStatus.RECEIVED);

		//4. Mysql과 MonogoDB에 AI 응답 메시지 저장
		saveMessage(messageUUID, chatting, MessageSender.AI, null, MessageStatus.PROCESSING);

		//5. JudgeModel 호출
		// 임의로 userId = 1로 함수 호출 | 로그인 기능 개발 후 변경
		aiService.callInputJudgeModel(messageUUID, content);

		return new SubmitMessageResponseDto(chattingId, messageUUID);
	
	}

	/**
	 * Judge 모델 완료 이벤트를 수신(구독)하는 리스너
	 */
	@Async
	@EventListener
	public void handleJudgeModelComplete(JudgeModelCompleteEvent event) {

		String messageUUID = event.getMessageUUID();
		InputJudgeResponseDto judgeResponse = event.getJudgeResponse();
		ScoreInfo scoreInfo = judgeResponse.getScoreInfo();

		// 1. 이벤트에서 받은 UUID로 MongoDB에서 메시지 도큐먼트를 찾습니다.
		MessageDocument messageToUpdate = messageMongoRepository.findByUuidAndSenderType(messageUUID, MessageSender.USER)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		Message message = messageJpaRepository.findByUuid(messageUUID)
			.orElseThrow(() -> new BusinessException("메시지를 찾을 수 없습니다."));

		// 2. Judge 결과를 도큐먼트에 업데이트하고 저장합니다.
		messageToUpdate.updateScoreInfo(scoreInfo);
		messageMongoRepository.save(messageToUpdate);

		// 3. Message에 대한 점수 score 테이블에 insert
		scoreService.saveScore(message, scoreInfo);
		
		// 4. 새로 생성된 채팅방인 경우 채팅방의 이름을 첫 입력에 대한 요약 값으로 변경
		chattingService.setChattingTitle(messageToUpdate.getChattingId(), judgeResponse.getSummary());
		
		// 5. 각 점수에 대한 전체 평균을 집계를 위해 REDIS 점수 저장

	}

	/**
	 * MYSQL과 MONGODB에 메시지 저장 함수
	 * */
	private void saveMessage(String messageUUID, Chatting chatting, MessageSender messageSender, String content, MessageStatus messageStatus) {
		
		Message message = Message.builder()
			.uuid(messageUUID)
			.chatting(chatting)
			.senderType(messageSender)
			.build();

		MessageDocument messageDocument = MessageDocument.builder()
			.uuid(messageUUID)
			.content(content)
			.chattingId(chatting.getId())
			.senderType(messageSender)
			.status(messageStatus)
			.scoreInfo(null)
			.build();

		messageJpaRepository.save(message);
		messageMongoRepository.save(messageDocument);
	
	}

}
