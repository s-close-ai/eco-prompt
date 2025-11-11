package com.closeai.ecoprompt.message.repository.mongo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.closeai.ecoprompt.message.model.dto.response.MessageKeywordDto;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;

public interface MessageMongoRepository extends MongoRepository<MessageDocument, Long> {

	Optional<MessageDocument> findByMessageUUIDAndSenderType(String messageUUID, MessageSender senderType);

	Page<MessageDocument> findByChattingIdAndSenderType(Long chattingId, MessageSender senderType, Pageable pageable);

	List<MessageDocument> findByChattingIdAndMessageUUIDInAndSenderType(Long chattingId, List<String> messageUUIDs,
		MessageSender senderType);

	// (추가) 여러 UUID + 여러 발신자 타입으로 한 번에 조회
	List<MessageDocument> findByMessageUUIDInAndSenderTypeIn(
		Collection<String> messageUUIDs, Collection<MessageSender> senderTypes
	);

	/**
	 * 메시지 내부 keyword로 검색하는 query문
	 * 각 채팅방에 keyword가 포함된 메시지가 많은 경우에 최신 순 딱 하나만
	 * */
	@Aggregation(pipeline = {
		// 1. $match (필터링)
		"{ $match: { " +
			"'messageUUID': { $in: ?0 }, " +
			"'sender_type': { $in: ?1 }, " +
			"'status': { $ne: ?2 }, " +
			"'content': { $regex: ?3, $options: 'i' } " + // $options: 'i' 는 대소문자 무시
			"} }",

		// 2. $sort (최신 메시지 시간순으로 정렬)
		"{ $sort: { 'updatedAt': -1 } }",

		// 3. $group (chattingId로 그룹화 및 최신 메시지 시간 탐색)
		"{ $group: { " +
			"_id: '$chatting_id', " +  // @Field("chatting_id")
			"mostRecentMessageTime: { $max: '$updatedAt' }, " + // MongoBaseEntity의 createdAt
			"content: { $first: '$content' } " +
			"} }",

		// 4. $project (결과 DTO에 매핑)
		"{ $project: { " +
			"id: '$_id', " + // DTO 'id'(String) <- chattingId
			"content :  '$content'" +
			"} }"
	})
	List<MessageKeywordDto> findRecentChattingIdsByKeyword(
		List<String> messageUUIDs,
		List<MessageSender> senderTypes,
		MessageStatus excludedStatus,
		String keyword
	);

}