package com.closeai.ecoprompt.userinfo.model.dto.request;

import org.hibernate.validator.constraints.Length;

import io.swagger.v3.oas.annotations.media.Schema;

public record UpdatePersonalPromptRequest(

	@Schema(example = "무조건 높임말로 해주세요.")
	@Length(max = 1000)
	String personalPrompt
) {
}
