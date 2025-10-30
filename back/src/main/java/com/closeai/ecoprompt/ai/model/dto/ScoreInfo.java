package com.closeai.ecoprompt.ai.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class ScoreInfo {

	Double totalScore;
	Double clarityScore;
	Double specificityScore;
	Double formatScore;
	Double safetyScore;

}
