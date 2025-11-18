package com.closeai.ecoprompt.message.model.entity;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.mapping.Document;

import com.closeai.ecoprompt.common.entity.MongoBaseEntity;

import jakarta.persistence.Id;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Document(collection = "file_events")
public class FileEvent extends MongoBaseEntity {

	@Id
	private ObjectId id;
	private String messageUUID;
	private String status;
	private Integer userId;
	private String userInput;
	private List<String> s3KeyList;
	private String finalPrompt;
	private String errorMessage;
}
