package com.closeai.ecoprompt.message.model.dto.request;

import org.hibernate.validator.constraints.Length;

import io.swagger.v3.oas.annotations.media.Schema;

public record UpdateMessageRequest(
	@Schema(example = "1")
	Integer projectId,

	@Schema(example = "1")
	Long chattingId,

	@Schema(example = "10+10의 결과값을 알려주세요. 수식 형태로 결과값을 알려주세요!")
	@Length(min = 1, max = 15000)
	String content,

	@Schema(example = "550e8400-e29b-41d4-a716-446655440000")
	String messageUUID
) {
}
