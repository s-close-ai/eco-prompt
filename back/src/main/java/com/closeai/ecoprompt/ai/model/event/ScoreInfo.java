package com.closeai.ecoprompt.ai.model.event;

public record ScoreInfo(
	Double totalScore,
	Double clarityScore,
	Double specificityScore,
	Double formatScore,
	Double safetyScore
) {

}
