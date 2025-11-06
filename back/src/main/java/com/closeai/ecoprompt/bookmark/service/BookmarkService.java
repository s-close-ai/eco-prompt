package com.closeai.ecoprompt.bookmark.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.bookmark.model.dto.request.CreateBookmarkRequest;
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
			.title(request.url())
			.url(request.url())
			.description(request.description())
			.sequence(maxSequence + 1)
			.owner(user)
			.build();

		return bookmarkRepository.save(bookmark).getId();
	}
}
