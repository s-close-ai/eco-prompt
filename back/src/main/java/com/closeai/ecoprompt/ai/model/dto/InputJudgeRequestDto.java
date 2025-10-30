package com.closeai.ecoprompt.ai.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;

@Builder
@AllArgsConstructor
public class InputJudgeRequestDto {

	private String messageUUID;
	private String userInput;

}