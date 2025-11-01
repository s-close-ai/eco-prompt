package com.closeai.ecoprompt.message.repository.mongo;

import java.util.Optional;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

public interface MessageMongoRepository extends MongoRepository<MessageDocument, Long> {

	Optional<MessageDocument> findByMessageUUIDAndSenderType(String messageUUID, MessageSender senderType);

}