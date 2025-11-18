package com.closeai.ecoprompt.message.model.dto.response;

public record FileMessage(
	Long fileId,
	String originalFileName,
	String fileUrl
) {

	public static FileMessage of(Long id, String name, String url) {
		return new FileMessage(id, name, url);
	}
}
