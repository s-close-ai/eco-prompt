package com.closeai.ecoprompt.message.service;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.service.AiService;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageRequestDto;
import com.closeai.ecoprompt.message.model.dto.SubmitMessageResponseDto;
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

		//5. AI 모델 비동기 처리
		aiService.callAIModel(messageUUID, content);

		return new SubmitMessageResponseDto(chattingId, messageUUID);
	}

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
			.build();

		messageJpaRepository.save(message);
		messageMongoRepository.save(messageDocument);
	}

}
