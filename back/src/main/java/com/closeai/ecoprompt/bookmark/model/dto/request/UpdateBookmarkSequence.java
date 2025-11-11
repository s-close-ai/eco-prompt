package com.closeai.ecoprompt.bookmark.model.dto.request;

import java.util.List;

public record UpdateBookmarkSequence(
	List<Long> bookmarkIds
) {
}
