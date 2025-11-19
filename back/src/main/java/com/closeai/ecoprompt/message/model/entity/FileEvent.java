package com.closeai.ecoprompt.message.model.entity;

import java.util.List;

import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

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
	private FileEventStatus status;

	@Field("user_id")
	private Integer userId;

	@Field("user_input")
	private String userInput;

	@Field("s3Key_list")
	private List<String> s3KeyList;

	@Field("final_prompt")
	private String finalPrompt;

	@Field("error_message")
	private String errorMessage;
}
