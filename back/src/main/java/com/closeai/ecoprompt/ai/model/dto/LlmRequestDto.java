package com.closeai.ecoprompt.ai.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;

@Builder
@AllArgsConstructor
public class LlmRequestDto {

	String personalPrompt;
	String userInput;
	String messageUUID;
}
