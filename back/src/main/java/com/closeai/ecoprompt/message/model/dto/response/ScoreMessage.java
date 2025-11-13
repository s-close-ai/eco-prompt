package com.closeai.ecoprompt.message.model.dto.response;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;

public record ScoreMessage(
	MessageStatus messageStatus,
	GetScoreInfo scoreInfo
) {

	public static ScoreMessage from(MessageDocument message) {
		return new ScoreMessage(
			message.getStatus(),
			message.getScoreInfo() != null
				? GetScoreInfo.from(message.getScoreInfo())
				: null);
	}
}
