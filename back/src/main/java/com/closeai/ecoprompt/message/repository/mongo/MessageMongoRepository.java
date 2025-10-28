package com.closeai.ecoprompt.message.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

public interface MessageMongoRepository extends MongoRepository<MessageDocument, Long> {
}
