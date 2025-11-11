package com.closeai.ecoprompt.bookmark.model.dto.response;

import com.closeai.ecoprompt.bookmark.model.entity.Bookmark;

public record BookmarkResponse(
	Long bookmarkId,
	String title,
	String url,
	String description
) {
	public static BookmarkResponse from(Bookmark bookmark) {
		return new BookmarkResponse(
			bookmark.getId(),
			bookmark.getTitle(),
			bookmark.getUrl(),
			bookmark.getDescription()
		);
	}
}
