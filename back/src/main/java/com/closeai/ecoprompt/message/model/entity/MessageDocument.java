package com.closeai.ecoprompt.message.model.entity;

import org.springframework.data.mongodb.core.mapping.Document;

import com.closeai.ecoprompt.common.entity.BaseEntity;

import lombok.Builder;

@Builder
@Document(collection = "message")
public class MessageDocument extends BaseEntity {
	
	private String uuid;
	private String content;
	private Long chattingId;
	private MessageSender senderType;
	private MessageStatus status;

}