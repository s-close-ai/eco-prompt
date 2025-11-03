package com.closeai.ecoprompt.message.model.dto.request;

import org.hibernate.validator.constraints.Length;

import io.swagger.v3.oas.annotations.media.Schema;

public record SubmitMessageRequest(
	@Schema(example = "1")
	Integer projectId,

	@Schema(example = "1")
	Long chattingId,

	@Schema(example = "1+1의 결과값을 알려주세요.")
	@Length(min = 1, max = 15000)
	String content
) {

}
