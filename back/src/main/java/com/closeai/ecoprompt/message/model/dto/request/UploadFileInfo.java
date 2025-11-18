package com.closeai.ecoprompt.message.model.dto.request;

public record UploadFileInfo(
	String fileUrl,
	String originalFileName,
	Long fileId    // 추가됨
) {
}
