package com.closeai.ecoprompt.message.model.dto.response;

import java.util.List;

import org.springframework.data.domain.Page;

public record MessagePageResponse(
	List<GetMessageResponse> content,
	boolean last
) {
	public static MessagePageResponse from(Page<GetMessageResponse> page) {
		return new MessagePageResponse(
			page.getContent(),
			page.isLast()
		);
	}
}
