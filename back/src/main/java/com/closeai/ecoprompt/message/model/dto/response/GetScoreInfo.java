package com.closeai.ecoprompt.message.model.dto.response;

import com.closeai.ecoprompt.ai.model.event.ScoreInfo;

public record GetScoreInfo(
	Double sc_ec_0,
	Double sc_ec_1,
	Double sc_ec_2,
	Double sc_ec_3,
	Double sc_ec_4
) {
	public static GetScoreInfo from(ScoreInfo scoreInfo) {
		return new GetScoreInfo(
			scoreInfo.totalScore(),
			scoreInfo.clarityScore(),
			scoreInfo.specificityScore(),
			scoreInfo.formatScore(),
			scoreInfo.safetyScore()
		);
	}
}
