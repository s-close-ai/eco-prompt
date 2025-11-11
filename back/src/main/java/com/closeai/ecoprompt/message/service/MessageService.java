package com.closeai.ecoprompt.message.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.service.AiService;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UpdateMessageRequest;
import com.closeai.ecoprompt.message.model.dto.response.GetMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MessageService {

	private final AiService aiService;
	private final ChattingService chattingService;
	private final UserInfoService userInfoService;

	private final MessageJpaRepository messageJpaRepository;
	private final MessageMongoRepository messageMongoRepository;

	private static final int MESSAGE_PAGE_SIZE = 10;

	/**
	 * 사용자 입력에 대한 API 처리 함수
	 * */
	@Transactional
	public SubmitMessageResponse submitMessage(SubmitMessageRequest messageCommand) {

		Integer projectId = messageCommand.projectId();
		Long chattingId = messageCommand.chattingId();
		String content = messageCommand.content();
		Integer userId = CustomUtil.getCurrentUserId();
		boolean isFirstChatting = (chattingId == null);

		//1. chattingID가 null인 경우 chatting 저장
		Chatting chatting = chattingService.getOrCreateChatting(chattingId, projectId);
		chattingId = chatting.getId();

		// 1-2. 새로운 채팅방이 아닌 경우 입력할 때마다 updatedAt을 수정
		if (!isFirstChatting) {
			chattingService.updateUpdateAt(chattingId);
		}

		//2. message에 대한 UUID 값 생성
		String messageUUID = CustomUtil.makeNewUUID();

		//3. Mysql과 MonogoDB에 사용자 입력 메시지 저장
		saveMessage(messageUUID, chatting, MessageSender.USER, content, MessageStatus.RECEIVED, userId);

		//4. Mysql과 MonogoDB에 AI 응답 메시지 저장
		saveMessage(messageUUID, chatting, MessageSender.AI, null, MessageStatus.PROCESSING, userId);

		//5. 사용자에 대한 프롬프트 수 + 1 증가
		userInfoService.increasePromptCnt(userId);

		//6. JudgeModel 호출
		aiService.callAiModel(messageUUID, content, userId, isFirstChatting);

		return new SubmitMessageResponse(chattingId, messageUUID);
	}

	/**
	 * 채팅방 내부에 있는 메시지 조회 함수
	 * */
	public Page<GetMessageResponse> getMessages(Long chattingId, Integer page) {

		AppLogger.start(chattingId + " 채팅방의 " + page + "페이지 조회");

		// 0. 사용자가 생성한 채팅방이 맞는지 검증하는 함수
		chattingService.validateChatting(chattingId);

		// 1. 사용자 입력 기준으로 최신 작성한 메시지 10개 조회
		Pageable pageable = PageRequest.of(page, MESSAGE_PAGE_SIZE, Sort.by(Sort.Direction.DESC, "updatedAt"));
		Page<MessageDocument> userMessagesPage = messageMongoRepository.findByChattingIdAndSenderType(chattingId,
			MessageSender.USER, pageable);

		// 2. 사용자가 작성한 메시지의 UUID 추출
		List<String> messageUUIDs = userMessagesPage.getContent().stream()
			.map(MessageDocument::getMessageUUID)
			.toList();

		if (messageUUIDs.isEmpty()) {
			return Page.empty(pageable);
		}

		// 3. message UUID 기준으로 AI 답변 조회
		List<MessageDocument> aiMessages = messageMongoRepository.findByChattingIdAndMessageUUIDInAndSenderType(
			chattingId, messageUUIDs, MessageSender.AI);

		// 4. AI 메시지 Map 변환
		Map<String, MessageDocument> aiMessageMap = aiMessages.stream()
			.collect(Collectors.toMap(MessageDocument::getMessageUUID, msg -> msg, (msg1, msg2) -> msg1));

		// 5. 사용자 메시지 정렬 기준으로 AI 답변을 가져와서 반환
		return userMessagesPage.map(userMessage -> {
			MessageDocument aiMessage = aiMessageMap.get(userMessage.getMessageUUID());
			return GetMessageResponse.of(userMessage, aiMessage);
		});
	}

	/**
	 * 사용자 입력 수정 API 처리 함수
	 * */
	@Transactional
	public SubmitMessageResponse updateMessage(UpdateMessageRequest messageCommand) {

		Long chattingId = messageCommand.chattingId();
		String content = messageCommand.content();
		String messageUUID = messageCommand.messageUUID();
		Integer userId = CustomUtil.getCurrentUserId();

		// 1. 기존에 있는 message MongoDB의 값을 변경
		updateMessageContent(messageUUID, content);

		// 2. 기존에 있는 chatting의 updatedAt 변경
		chattingService.updateUpdateAt(chattingId);

		// 3. JudgeModel 호출
		aiService.callAiModel(messageUUID, content, userId, false);

		return new SubmitMessageResponse(chattingId, messageUUID);
	}

	/**
	 * MYSQL과 MONGODB에 메시지 저장 함수
	 * */
	private void saveMessage(String messageUUID, Chatting chatting, MessageSender messageSender, String content,
		MessageStatus messageStatus, Integer userId) {

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
	private void updateMessageContent(String messageUUID, String content) {

		MessageDocument userDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
				MessageSender.USER)
			.orElseThrow(() -> new BusinessException("저장된 메시지가 없습니다."));
		MessageDocument aiDocument = messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
				MessageSender.AI)
			.orElseThrow(() -> new BusinessException("저장된 메시지가 없습니다."));

		userDocument.updateContent(content);
		userDocument.updateScoreInfo(null);

		aiDocument.updateContent(null);
		aiDocument.updateMessageStatus(MessageStatus.PROCESSING);

		List<MessageDocument> messageDocuments = List.of(userDocument, aiDocument);

		messageMongoRepository.saveAll(messageDocuments);
	}

}
