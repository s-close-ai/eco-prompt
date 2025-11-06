package com.closeai.ecoprompt.bookmark.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.closeai.ecoprompt.bookmark.model.dto.request.CreateBookmarkRequest;
import com.closeai.ecoprompt.bookmark.model.dto.request.DeleteBookmarkRequest;
import com.closeai.ecoprompt.bookmark.model.dto.request.UpdateBookmarkSequence;
import com.closeai.ecoprompt.bookmark.service.BookmarkService;
import com.closeai.ecoprompt.common.ApiResponse;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/bookmarks")
public class BookmarkController implements BookmarkControllerDocs {

	private final BookmarkService bookmarkService;

	@PostMapping
	public ResponseEntity<ApiResponse<Long>> createBookmark(@RequestBody @Valid CreateBookmarkRequest request) {

		return ApiResponse.success(bookmarkService.createBookmark(request));
	}

	@PatchMapping("/delete")
	public ResponseEntity<ApiResponse<Void>> deleteBookmark(@RequestBody DeleteBookmarkRequest request) {
		return ApiResponse.noContent(bookmarkService.deleteBookmark(request));
	}

	@PatchMapping("/{bookmarkId}")
	public ResponseEntity<ApiResponse<Void>> updateBookmark(@PathVariable Long bookmarkId,
		@RequestBody @Valid CreateBookmarkRequest request) {
		return ApiResponse.success(bookmarkService.updateBookmark(bookmarkId, request));
	}

	@PatchMapping("/sequence")
	public ResponseEntity<ApiResponse<Void>> updateBookmarkSequence(@RequestBody UpdateBookmarkSequence request) {
		return ApiResponse.success(bookmarkService.updateBookmarkSequence(request));
	}

}
