package com.closeai.ecoprompt.ai.model.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;

public record LlmResponse(
	Object token,
	@JsonProperty("sequence_id")
	Integer sequenceId
) {

}
