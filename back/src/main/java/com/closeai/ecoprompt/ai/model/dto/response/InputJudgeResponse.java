package com.closeai.ecoprompt.ai.model.dto.response;

import com.closeai.ecoprompt.ai.model.dto.ScoreInfo;

public record InputJudgeResponse(
	String summary,
	ScoreInfo scoreInfo
) {

}