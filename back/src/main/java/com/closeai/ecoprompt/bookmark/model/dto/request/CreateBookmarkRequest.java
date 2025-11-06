package com.closeai.ecoprompt.bookmark.model.dto.request;

import org.hibernate.validator.constraints.Length;

import io.swagger.v3.oas.annotations.media.Schema;

public record CreateBookmarkRequest(

	@Schema(example = "북마크입니다!")
	@Length(max = 100)
	String title,
	String url,
	
	@Schema(example = "북마크 설명")
	@Length(max = 100)
	String description
) {
}
