package com.closeai.ecoprompt.chatting.model.dto.request;

import org.hibernate.validator.constraints.Length;

import io.swagger.v3.oas.annotations.media.Schema;

public record UpdateChattingTitleRequest(
	@Schema(example = "채팅방 이름 변경!")
	@Length(max = 100)
	String title
) {
}
