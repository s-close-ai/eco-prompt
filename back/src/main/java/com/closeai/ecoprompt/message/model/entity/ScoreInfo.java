package com.closeai.ecoprompt.message.model.entity;

public record ScoreInfo(
	Double totalScore,
	Double clarityScore,
	Double specificityScore,
	Double formatScore,
	Double safetyScore
) {

}
