package com.closeai.ecoprompt.ai.model.dto.response;

public record InputJudgeResponse(
	String summary,
	Double totalScore,
	Double clarityScore,
	Double specificityScore,
	Double formatScore,
	Double safetyScore
) {

}