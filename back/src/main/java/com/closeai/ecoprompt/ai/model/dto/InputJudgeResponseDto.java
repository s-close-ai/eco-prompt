package com.closeai.ecoprompt.ai.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@AllArgsConstructor
@Builder
public class InputJudgeResponseDto {

	String summary;
	ScoreInfo scoreInfo;

}