package com.closeai.ecoprompt.bookmark.controller;

import org.springframework.http.ResponseEntity;

import com.closeai.ecoprompt.bookmark.model.dto.request.CreateBookmarkRequest;
import com.closeai.ecoprompt.bookmark.model.dto.request.DeleteBookmarkRequest;
import com.closeai.ecoprompt.common.ApiResponse;

import io.swagger.v3.oas.annotations.Operation;

public interface BookmarkControllerDocs {

	@Operation(summary = "북마크를 생성하는 API")
	ResponseEntity<ApiResponse<Long>> createBookmark(CreateBookmarkRequest request);

	@Operation(summary = "북마크를 삭제하는 API")
	ResponseEntity<ApiResponse<Void>> deleteBookmark(DeleteBookmarkRequest request);
}
