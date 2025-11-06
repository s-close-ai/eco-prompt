package com.closeai.ecoprompt.message.model.dto.response;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;

public record AiMessage(
	MessageStatus messageStatus,
	String content
) {
	public static AiMessage from(MessageDocument message) {
		return new AiMessage(
			message.getStatus(),
			message.getContent()
		);
	}
}
