package com.closeai.ecoprompt.bookmark.model.dto.response;

import com.closeai.ecoprompt.bookmark.model.entity.Bookmark;

public record BookmarkResponse(
	String title,
	String url,
	String description
) {
	public static BookmarkResponse from(Bookmark bookmark) {
		return new BookmarkResponse(
			bookmark.getTitle(),
			bookmark.getUrl(),
			bookmark.getDescription()
		);
	}
}
