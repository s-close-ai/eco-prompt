package com.closeai.ecoprompt.message.model.dto.response;

import java.util.Collections;
import java.util.List;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

public record GetMessageResponse(
	UserMessage userMessage,
	ScoreMessage scoreMessage,
	AiMessage aiMessage,
	List<FileMessage> userFileList,
	FileMessage aiFile
) {
	public static GetMessageResponse of(MessageDocument userMessage, MessageDocument aiMessage,
		List<FileMessage> userFileList, FileMessage aiFile) {
		return new GetMessageResponse(
			UserMessage.from(userMessage),
			ScoreMessage.from(userMessage),
			AiMessage.from(aiMessage),
			userFileList != null ? userFileList : Collections.emptyList(),
			aiFile
		);
	}
}
