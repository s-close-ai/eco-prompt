package com.closeai.ecoprompt.message.model.dto.response;

public record JudgeOnlyResponse(
	String messageStatus,
	GetScoreInfo scoreInfo
) {
}
