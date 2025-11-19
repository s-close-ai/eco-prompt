package com.closeai.ecoprompt.ai.model.dto.response;

public record LLMFileResponse(
	String originalFileName,
	String savedFileName,
	String url
) {
}
