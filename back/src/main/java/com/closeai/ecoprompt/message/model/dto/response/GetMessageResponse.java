package com.closeai.ecoprompt.message.model.dto.response;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

public record GetMessageResponse(
	UserMessage userMessage,
	ScoreMessage scoreMessage,
	AiMessage aiMessage
) {
	public static GetMessageResponse of(MessageDocument userMessage, MessageDocument aiMessage) {
		return new GetMessageResponse(
			UserMessage.from(userMessage),
			ScoreMessage.from(userMessage),
			AiMessage.from(aiMessage)
		);
	}
}
