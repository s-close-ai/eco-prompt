package com.closeai.ecoprompt.message.repository.mongo;

import org.springframework.data.mongodb.repository.MongoRepository;

import com.closeai.ecoprompt.message.model.entity.FileEvent;

public interface FileEventRepository extends MongoRepository<FileEvent, Long> {
}
