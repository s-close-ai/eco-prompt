package com.closeai.ecoprompt.message.model.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

public record SubmitMessageResponse(
	@Schema(example = "1")
	Long chattingId,

	@Schema(example = "550e8400-e29b-41d4-a716-446655440000")
	String messageUUID
) {

}