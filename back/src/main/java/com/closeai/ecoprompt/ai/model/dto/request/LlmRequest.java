package com.closeai.ecoprompt.ai.model.dto.request;

public record LlmRequest(
	String personalPrompt,
	String userInput,
	String messageUUID
) {

}
