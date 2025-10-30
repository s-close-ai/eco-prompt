package com.closeai.ecoprompt.message.model.entity;

import org.springframework.data.mongodb.core.mapping.Document;

import com.closeai.ecoprompt.ai.model.dto.ScoreInfo;
import com.closeai.ecoprompt.common.entity.BaseEntity;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Document(collection = "message")
public class MessageDocument extends BaseEntity {
	
	private String uuid;
	private String content;
	private Long chattingId;
	private MessageSender senderType;
	private MessageStatus status;
	private ScoreInfo scoreInfo;

	public void updateScoreInfo(ScoreInfo scoreInfo) {
		this.scoreInfo = scoreInfo;
	}

	public void updateMessageStatus(MessageStatus status) {
		this.status = status;
	}

}