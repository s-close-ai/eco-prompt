package com.closeai.ecoprompt.bookmark.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.bookmark.model.dto.request.CreateBookmarkRequest;
import com.closeai.ecoprompt.bookmark.model.dto.request.DeleteBookmarkRequest;
import com.closeai.ecoprompt.bookmark.model.dto.request.UpdateBookmarkSequence;
import com.closeai.ecoprompt.bookmark.model.dto.response.BookmarkResponse;
import com.closeai.ecoprompt.bookmark.model.dto.response.GetBookmarkResponse;
import com.closeai.ecoprompt.bookmark.model.entity.Bookmark;
import com.closeai.ecoprompt.bookmark.repository.BookmarkRepository;
import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.user.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BookmarkService {

	private final BookmarkRepository bookmarkRepository;
	private final UserRepository userRepository;

	private final static int BOOKMARK_COUNT_LIMIT = 12;

	/**
	 * 북마크 생성하는 API 처리 함수
	 * */
	@Transactional
	public Long createBookmark(CreateBookmarkRequest request) {

		Integer userId = CustomUtil.getCurrentUserId();
		long bookmarkCount = bookmarkRepository.countByOwnerIdAndIsDeleted(userId, 'N');

		if (bookmarkCount >= BOOKMARK_COUNT_LIMIT) {
			throw new BusinessException("북마크 최대 생성 갯수인 " + BOOKMARK_COUNT_LIMIT + "를 넘었습니다. ");
		}

		User user = userRepository.findById(userId).orElseThrow(
			() -> new BusinessException("사용자를 찾을 수 없습니다."));

		Integer maxSequence = bookmarkRepository.findMaxSequenceByUserId(userId);

		Bookmark bookmark = Bookmark.builder()
			.title(request.title())
			.url(request.url())
			.description(request.description())
			.sequence(maxSequence + 1)
			.owner(user)
			.build();

		return bookmarkRepository.save(bookmark).getId();
	}

	/**
	 * 북마크 삭제하는 API 처리 함수
	 * */
	@Transactional
	public Void deleteBookmark(DeleteBookmarkRequest request) {

		Long bookmarkId = request.bookmarkId();
		Bookmark bookmark = validateBookmark(bookmarkId);

		bookmark.updateIsDelete();
		return null;
	}

	/**
	 * 북마크 수정 API 처리 함수
	 * */
	@Transactional
	public Void updateBookmark(Long bookmarkId, CreateBookmarkRequest request) {

		Bookmark bookmark = validateBookmark(bookmarkId);

		bookmark.updateTitle(request.title());
		bookmark.updateUrl(request.url());
		bookmark.updateDescription(request.description());

		return null;
	}

	/**
	 * 북마크 순서 수정 API 처리 함수
	 * */
	@Transactional
	public Void updateBookmarkSequence(UpdateBookmarkSequence request) {

		List<Long> bookmarkIds = request.bookmarkIds();

		for (int index = 1; index <= bookmarkIds.size(); index++) {
			Bookmark bookmark = validateBookmark(bookmarkIds.get(index - 1));

			bookmark.updateSequence(index);
		}

		return null;
	}

	/**
	 * 북마크 조회하는 API 처리 함수
	 * */
	public GetBookmarkResponse getBookmarks() {

		Integer userId = CustomUtil.getCurrentUserId();

		List<Bookmark> bookmarks = bookmarkRepository.getBookmarkByOwnerIdAndIsDeletedOrderBySequenceAsc(userId, 'N');

		List<BookmarkResponse> bookmarkResponses = bookmarks.stream()
			.map(BookmarkResponse::from).toList();

		return new GetBookmarkResponse(
			bookmarks.size(),
			bookmarkResponses
		);
	}

	private Bookmark validateBookmark(Long bookmarkId) {

		Optional<Bookmark> bookmark = bookmarkRepository.findById(bookmarkId);
		Integer userId = CustomUtil.getCurrentUserId();

		if (!bookmark.isPresent()) {
			throw new BusinessException("북마크가 존재하지 않습니다.");
		}
		if (!bookmark.get().getOwner().getId().equals(userId)) {
			throw new BusinessException("사용자가 생성한 북마크가 아닙니다.");
		}
		if (bookmark.get().getIsDeleted() == 'Y') {
			throw new BusinessException("이미 삭제된 북마크입니다.");
		}

		return bookmark.get();
	}
}
