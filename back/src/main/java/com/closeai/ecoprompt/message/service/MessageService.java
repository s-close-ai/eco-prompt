package com.closeai.ecoprompt.message.service;

import java.util.List;

import com.closeai.ecoprompt.common.CustomUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.service.AiService;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UpdateMessageRequest;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MessageService {

	private final AiService aiService;
	private final ChattingService chattingService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;
	
	/**
	 * 사용자 입력에 대한 API 처리 함수
	 * */
	@Transactional
	public SubmitMessageResponse submitMessage(SubmitMessageRequest messageCommand, Integer userId) {

		Integer projectId = messageCommand.projectId();
		Long chattingId = messageCommand.chattingId();
		String content = messageCommand.content();
		boolean isFirstChatting = (chattingId == null);

		//1. chattingID가 null인 경우 chatting 저장
		Chatting chatting = chattingService.getOrCreateChatting(chattingId, projectId);
		chattingId = chatting.getId();

		// 1-2. 새로운 채팅방이 아닌 경우 입력할 때마다 updatedAt을 수정
		if(!isFirstChatting) {
			chattingService.updateUpdateAt(chattingId);
		}

		//2. message에 대한 UUID 값 생성
		String messageUUID = CustomUtil.makeNewUUID();

		//3. Mysql과 MonogoDB에 사용자 입력 메시지 저장
		saveMessage(messageUUID, chatting, MessageSender.USER, content, MessageStatus.RECEIVED, userId);

		//4. Mysql과 MonogoDB에 AI 응답 메시지 저장
		saveMessage(messageUUID, chatting, MessageSender.AI, null, MessageStatus.PROCESSING, userId);

		//5. JudgeModel 호출
		// TODO : 임의로 userId = 1로 함수 호출 | 로그인 기능 개발 후 변경
		aiService.callAiModel(messageUUID, content, userId, isFirstChatting);

		return new SubmitMessageResponse(chattingId, messageUUID);
	}

	/**
	 * 사용자 입력 수정 API 처리 함수
	 * */
	@Transactional
	public SubmitMessageResponse updateMessage(UpdateMessageRequest messageCommand, Integer userId) {

		Long chattingId = messageCommand.chattingId();
		String content = messageCommand.content();
		String messageUUID = messageCommand.messageUUID();

		// 1. 기존에 있는 message MongoDB의 값을 변경
		updateMessageContent(messageUUID, content);

		// 2. 기존에 있는 chatting의 updatedAt 변경
		chattingService.updateUpdateAt(chattingId);

		// 3. JudgeModel 호출
		aiService.callAiModel(messageUUID, content, 1, false);

		return new SubmitMessageResponse(chattingId, messageUUID);
	}

	/**
	 * MYSQL과 MONGODB에 메시지 저장 함수
	 * */
	private void saveMessage(String messageUUID, Chatting chatting, MessageSender messageSender, String content, MessageStatus messageStatus, Integer userId) {
		
		Message message = Message.builder()
			.messageUUID(messageUUID)
			.chatting(chatting)
			.senderType(messageSender)
			.userId(userId)
			.build();

		MessageDocument messageDocument = MessageDocument.builder()
			.messageUUID(messageUUID)
			.content(content)
			.chattingId(chatting.getId())
			.senderType(messageSender)
			.status(messageStatus)
			.scoreInfo(null)
			.build();

		messageJpaRepository.save(message);
		messageMongoRepository.save(messageDocument);
	}

	/**
	 * MongoDB 기존의 메시지 값
	 * */
	private void updateMessageContent(String messageUUID, String content){

		MessageDocument userDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, MessageSender.USER)
			.orElseThrow(() -> new BusinessException("저장된 메시지가 없습니다."));
		MessageDocument aiDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, MessageSender.AI)
			.orElseThrow(() -> new BusinessException("저장된 메시지가 없습니다."));

		userDocument.updateContent(content);
		userDocument.updateScoreInfo(null);

		aiDocument.updateContent(null);
		aiDocument.updateMessageStatus(MessageStatus.PROCESSING);

		messageMongoRepository.saveAll(List.of(userDocument, aiDocument));
	}

}
