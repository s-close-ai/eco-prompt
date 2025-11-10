package com.closeai.ecoprompt.message.repository.mongo;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

public interface MessageMongoRepository extends MongoRepository<MessageDocument, Long> {

	Optional<MessageDocument> findByMessageUUIDAndSenderType(String messageUUID, MessageSender senderType);

	Page<MessageDocument> findByChattingIdAndSenderType(Long chattingId, MessageSender senderType, Pageable pageable);

	List<MessageDocument> findByChattingIdAndMessageUUIDInAndSenderType(Long chattingId, List<String> messageUUIDs,
		MessageSender senderType);

	// (추가) 여러 UUID + 여러 발신자 타입으로 한 번에 조회
	List<MessageDocument> findByMessageUUIDInAndSenderTypeIn(
			Collection<String> messageUUIDs, Collection<MessageSender> senderTypes
	);

}