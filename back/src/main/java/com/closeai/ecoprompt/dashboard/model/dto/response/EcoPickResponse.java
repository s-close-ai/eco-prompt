package com.closeai.ecoprompt.dashboard.model.dto.response;

public record EcoPickResponse(
	String name,
	Double sc_ec_0,
	String prompt,
	DetailScoreResponse detailScore
) {
}
