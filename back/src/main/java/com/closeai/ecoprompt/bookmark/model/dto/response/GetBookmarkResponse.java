package com.closeai.ecoprompt.bookmark.model.dto.response;

import java.util.List;

public record GetBookmarkResponse(
	int bookmarkCount,
	List<BookmarkResponse> bookmarks
) {
}
