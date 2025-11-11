package com.closeai.ecoprompt.userinfo.model.dto.response;

public record GetUserInfoResponse(
	char sharingPrompt,
	String personalPrompt
) {
}
