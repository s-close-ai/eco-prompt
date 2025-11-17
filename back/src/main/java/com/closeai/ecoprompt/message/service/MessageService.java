package com.closeai.ecoprompt.message.service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.ai.service.AiService;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.repository.ChattingRepository;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.model.dto.request.SubmitMessageRequest;
import com.closeai.ecoprompt.message.model.dto.request.UpdateMessageRequest;
import com.closeai.ecoprompt.message.model.dto.response.GetMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.GetScoreInfo;
import com.closeai.ecoprompt.message.model.dto.response.JudgeOnlyResponse;
import com.closeai.ecoprompt.message.model.dto.response.MessageKeywordDto;
import com.closeai.ecoprompt.message.model.dto.response.SearchMessageResponse;
import com.closeai.ecoprompt.message.model.dto.response.SubmitMessageResponse;
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
import reactor.core.publisher.Mono;

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
	private static final int MESSAGE_SNIPPET_SIZE = 50;
	private final ChattingRepository chattingRepository;
	private final ScoreService scoreService;
	private final MileageService mileageService;

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

		// 1. 기존 메시지 정보 조회
		MessageDocument userMessage = getMessageDocument(messageUUID, MessageSender.USER);
		Message message = getMessage(messageUUID, MessageSender.USER);

		// 1-2. 기존 상태가 COMPLETED 인 경우 점수/ 마일리지 롤백
		if (userMessage.getStatus().equals(MessageStatus.COMPLETED)) {
			ScoreInfo oldScoreInfo = userMessage.getScoreInfo();
			if (oldScoreInfo != null) {
				// 점수 ROLLBACK
				scoreService.rollbackScore(message, userId, oldScoreInfo);
				// 마일리지 ROLLBACK
				mileageService.rollbackMileage(message, userId, oldScoreInfo.totalScore());
			}
		}

		// 1-3. 기존에 있는 message MongoDB의 값을 변경
		updateMessageContent(messageUUID, content);

		// 2. 기존에 있는 chatting의 updatedAt 변경
		chattingService.updateUpdateAt(chattingId);

		// 3. JudgeModel 호출
		aiService.callAiModel(messageUUID, content, userId, false);

		return new SubmitMessageResponse(chattingId, messageUUID);
	}

	/**
	 * 메시지 키워드 검색 API 함수
	 * */
	public List<SearchMessageResponse> searchMessage(String keyword) {

		Integer userId = CustomUtil.getCurrentUserId();
		String lowerKeywoard = keyword.toLowerCase();

		// 1. message에서 userId 값을 기준으로 messageUUID 값을 가져오기
		List<String> messageUUIDs = messageJpaRepository.findMessageUUIDByUserId(userId);

		// 2. 해당 chattingId를 포함하면서 KEYWORD가 포함된 메시지들을 모두 조회함 / error는 조회하지 않음
		List<MessageKeywordDto> mongoDBSearch = messageMongoRepository.findRecentChattingIdsByKeyword(
			messageUUIDs, List.of(MessageSender.AI, MessageSender.USER), MessageStatus.ERROR, keyword);

		// 3. 조회 시 각 CHATTING ID를 기준으로 제목과 updatedAt의 값을 가져옴
		// 3-1. 메시지 내용을 Map<chattingId, 내용> 으로 관리
		Map<Long, String> messageContentMap = mongoDBSearch.stream()
			.collect(Collectors.toMap(
				MessageKeywordDto::id,
				dto -> createSnippet(dto.content(), keyword)
			));

		// 3-2. 사용자가 작성한 chattingID 값을 가져오기
		List<Chatting> allUserChatting = chattingRepository.findByUserIdOrderByUpdatedAtDesc(userId);

		return allUserChatting.stream()
			.flatMap(chatting ->
				processAndWrapChatting(chatting, lowerKeywoard, messageContentMap))
			.sorted(Comparator.comparing(SearchResultWrapper::priority))
			.map(SearchResultWrapper::response)
			.toList();
	}

	/**
	 * Judge 메시지 호출 API 함수
	 * */
	public Mono<JudgeOnlyResponse> updateJudgeResult(UpdateMessageRequest messageCommand) {

		Long chattingId = messageCommand.chattingId();
		String content = messageCommand.content();
		String messageUUID = messageCommand.messageUUID();
		Integer userId = CustomUtil.getCurrentUserId();

		// 1. 기존 메시지의 상태가 ERROR 인지 확인
		validateMessageStatus(messageUUID, MessageSender.USER);

		return aiService.callJudgeModelOnly(messageUUID, content, userId, false)
			.map(judgeResponse -> {
				// 3. InputJudgeResponse에서 ScoreInfo 생성
				ScoreInfo scoreInfo = new ScoreInfo(
					judgeResponse.totalScore(),
					judgeResponse.clarityScore(),
					judgeResponse.specificityScore(),
					judgeResponse.formatScore(),
					judgeResponse.safetyScore()
				);

				// 4. GetScoreInfo DTO를 따로 변수에 담지 않고 바로 생성자에 전달
				return new JudgeOnlyResponse(
					MessageStatus.COMPLETED.toString(),
					GetScoreInfo.from(scoreInfo) // ⬅️ 'getScoreInfo' 변수 제거
				);
			});
	}

	/**
	 * LLM 메시지 호출 API 함수
	 * */
	public void updateLLMResult(UpdateMessageRequest messageCommand) {
		Long chattingId = messageCommand.chattingId();
		String content = messageCommand.content();
		String messageUUID = messageCommand.messageUUID();
		Integer userId = CustomUtil.getCurrentUserId();

		// 1. 기존의 메시지 상태가 ERROR 인지 확인
		validateMessageStatus(messageUUID, MessageSender.AI);
		aiService.callLlmModelOnly(messageUUID, content, userId);
	}

	/**
	 * MongoDB에 저장된 메시지 조회
	 * */
	private MessageDocument getMessageDocument(String messageUUID, MessageSender sender) {
		return messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID, sender)
			.orElseThrow(() -> new BusinessException("저장된 메시지가 없습니다."));
	}

	/**
	 * JPA에서 메시지 조회
	 * */
	private Message getMessage(String messageUUID, MessageSender sender) {
		return messageJpaRepository.findByMessageUUIDAndSenderType(messageUUID, sender)
			.orElseThrow(() -> new BusinessException("저장된 메시지가 없습니다."));
	}

	/**
	 * 오류 검사 함수
	 * */
	private void validateMessageStatus(String messageUUID, MessageSender sender) {
		MessageDocument message = getMessageDocument(messageUUID, sender);
		if (!message.getStatus().equals(MessageStatus.ERROR)) {
			throw new BusinessException("해당 메시지는 오류가 아닙니다.");
		}
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

		messageMongoRepository.findByMessageUUIDAndSenderType(messageUUID,
				MessageSender.TRAINING)
			.ifPresent(training -> {
				training.updateContent(null);
				training.updateMessageStatus(MessageStatus.PROCESSING);
				messageMongoRepository.save(training);
			});

		userDocument.updateContent(content);
		userDocument.updateScoreInfo(null);

		aiDocument.updateContent(null);
		aiDocument.updateMessageStatus(MessageStatus.PROCESSING);

		List<MessageDocument> messageDocuments = List.of(userDocument, aiDocument);

		messageMongoRepository.saveAll(messageDocuments);
	}

	/**
	 * Message Content에서 내용을 자르는 함수
	 * */
	private String createSnippet(String content, String keyword) {

		if (content == null || keyword == null) {
			return "";
		}

		// 대소문자 구분 없이 키워드 일치 찾기
		int keywordIdx = content.toLowerCase().indexOf(keyword.toLowerCase());
		// 키워드가 없는 경우
		if (keywordIdx == -1) {
			return content.substring(0, Math.min(content.length(), MESSAGE_SNIPPET_SIZE)) +
				(content.length() > MESSAGE_SNIPPET_SIZE ? "..." : "");
		}

		// 키워드 앞뒤로 몇 글자를 가져올지 계산
		int padding = (MESSAGE_SNIPPET_SIZE - keyword.length()) / 2;
		if (padding < 0)
			padding = 5;

		// 1. 시작 위치 계산
		int startIdx = Math.max(0, keywordIdx - padding);

		// 2. 끝 위치 게산
		int endIdx = Math.min(keywordIdx + keyword.length() + padding, content.length());

		// 3. 스니팻 추출
		if (startIdx == 0) {
			endIdx = Math.min((endIdx + padding), content.length());
		}
		String snippet = content.substring(startIdx, endIdx);
		String prefix = (startIdx > 0) ? "..." : "";
		String suffix = (endIdx < content.length()) ? "..." : "";

		return prefix + snippet + suffix;
	}

	/**
	 * 메시지 검색 우선순위 계산하는 함수
	 * */
	private Stream<SearchResultWrapper> processAndWrapChatting(
		Chatting chatting, String lowerKeyword, Map<Long, String> messageContentMap
	) {
		// 1. 제목 및 메시지가 일치하는지 확인
		boolean titleMatches = chatting.getTitle().toLowerCase().contains(lowerKeyword);
		boolean messageMatches = messageContentMap.containsKey(chatting.getId());

		int priority;
		String snippet = null;

		if (titleMatches) {
			priority = 1;
			if (messageMatches) {
				snippet = messageContentMap.get(chatting.getId());
			}
		} else if (!titleMatches && messageMatches) {
			priority = 2;
			snippet = messageContentMap.get(chatting.getId());
		} else {
			return Stream.empty();
		}

		SearchMessageResponse response = new SearchMessageResponse(
			chatting.getId(),
			chatting.getTitle(),
			snippet,
			chatting.getUpdatedAt()
		);

		return Stream.of(new SearchResultWrapper(response, priority));
	}

	private record SearchResultWrapper(SearchMessageResponse response, int priority) {
	}

}
