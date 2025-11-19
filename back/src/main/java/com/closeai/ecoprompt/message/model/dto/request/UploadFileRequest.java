package com.closeai.ecoprompt.message.model.dto.request;

public record UploadFileRequest(
	String originalFileName,
	String contentType
) {
}
