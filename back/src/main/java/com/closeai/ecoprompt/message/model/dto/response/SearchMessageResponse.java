package com.closeai.ecoprompt.message.model.dto.response;

public record SearchMessageResponse(
	Long chattingId,
	String chattingTitle,
	String content,
	String chattingUpdatedAt
) {
}
