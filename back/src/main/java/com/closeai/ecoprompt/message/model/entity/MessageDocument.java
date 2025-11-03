package com.closeai.ecoprompt.message.model.entity;

import org.bson.types.ObjectId;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.common.entity.MongoBaseEntity;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Document(collection = "message")
public class MessageDocument extends MongoBaseEntity {

	@Id
	private ObjectId messageID;
	private String messageUUID;
	private String content;

	@Field("chatting_id")
	private Long chattingId;

	@Field("sender_type")
	private MessageSender senderType;
	private MessageStatus status;

	@Field("score_info")
	private ScoreInfo scoreInfo;

	public void updateScoreInfo(ScoreInfo scoreInfo) {
		this.scoreInfo = scoreInfo;
	}

	public void updateContent(String content) {
		this.content = content;
	}

	public void updateMessageStatus(MessageStatus messageStatus) {
		this.status = messageStatus;
	}
}