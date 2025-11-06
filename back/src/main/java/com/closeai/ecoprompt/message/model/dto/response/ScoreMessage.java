package com.closeai.ecoprompt.message.model.dto.response;

import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageStatus;

public record ScoreMessage(
	MessageStatus messageStatus,
	ScoreInfo scoreInfo
) {

	public static ScoreMessage from(MessageDocument message) {
		return new ScoreMessage(
			message.getStatus(),
			message.getScoreInfo());
	}
}
