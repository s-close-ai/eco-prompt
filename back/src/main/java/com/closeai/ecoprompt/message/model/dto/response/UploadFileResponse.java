package com.closeai.ecoprompt.message.model.dto.response;

public record UploadFileResponse(
	String uploadUrl,    // AWS가 발급한 URL
	String savedFileName,
	Long fileId
) {
}
