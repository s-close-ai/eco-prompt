package com.closeai.ecoprompt.message.model.dto.response;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

public record UserMessage(
	String messageUUID,
	String content
) {
	public static UserMessage from(MessageDocument message) {
		return new UserMessage(
			message.getMessageUUID(),
			message.getContent()
		);
	}
}
