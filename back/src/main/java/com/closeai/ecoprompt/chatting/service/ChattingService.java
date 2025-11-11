package com.closeai.ecoprompt.chatting.service;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.chatting.model.dto.request.UpdateChattingProjectRequest;
import com.closeai.ecoprompt.chatting.model.dto.request.UpdateChattingTitleRequest;
import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.repository.ChattingRepository;
import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.project.model.entity.Project;
import com.closeai.ecoprompt.project.service.ProjectService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChattingService {

	private final ProjectService projectService;

	private final ChattingRepository chattingRepository;

	private static final int CHAT_PAGE_SIZE = 20;

	/**
	 * 채팅방 id에 해당하는 chatting이 있는 경우 반환
	 * 아니라면 새로 생성 후 반환
	 * */
	public Chatting getOrCreateChatting(Long chattingId, Integer projectId) {

		if (chattingId != null) {
			Chatting chatting = validateChatting(chattingId);

			if (chatting.getProject().getId().equals(projectId)) {
				return chatting;
			} else {
				throw new BusinessException("채팅방과 프로젝트의 아이디가 일치하지 않습니다.");
			}
		}

		Project project = projectService.getProject(projectId);
		Chatting chatting = Chatting.builder()
			.project(project)
			.build();

		return chattingRepository.save(chatting);
	}

	/**
	 * 프로젝트 내부 채팅방 목록 조회 함수
	 * */
	public Page<ChattingResponse> getChattings(Integer projectId, int page) {
		AppLogger.start(projectId + " 프로젝트의 " + page + " 페이지 조회");

		Pageable pageable = PageRequest.of(page, CHAT_PAGE_SIZE, Sort.by(Sort.Direction.DESC, "updatedAt"));
		Page<Chatting> chattingPage = chattingRepository.findByProject_IdAndIsDeleted(projectId, 'N', pageable);

		return chattingPage.map(ChattingResponse::from);
	}

	/**
	 * 채팅방 이름 변경하는 함수
	 * */
	@Transactional
	public Void setChattingTitle(Long chattingId, String title, Integer userId) {

		Optional<Chatting> chatting = chattingRepository.findByIdAndIsDeleted(chattingId, 'N');

		if (!chatting.isPresent() || !chatting.get().getProject().getOwner().getId().equals(userId)) {
			throw new BusinessException("채팅방이 없습니다.");
		}

		if (title.isEmpty()) {
			title = "CHAT";
		}
		chatting.get().setTitle(title);
		return null;
	}

	@Transactional
	public Void updateChattingTitle(Long chattingId, UpdateChattingTitleRequest request) {

		String title = request.title();
		Chatting chatting = validateChatting(chattingId);

		chatting.setTitle(title);

		return null;
	}

	/**
	 * 채팅방 프로젝트 변경하는 함수
	 * */
	@Transactional
	public Void updateChattingProject(Long chattingId, UpdateChattingProjectRequest request) {

		Chatting chatting = validateChatting(chattingId);
		Integer projectId = request.projectId();

		if (chatting.getProject().getId() == projectId) {
			throw new BusinessException("기존의 프로젝트로는 이동이 불가능 합니다.");
		}

		Project project = projectService.getProject(projectId);
		chatting.setProject(project);

		return null;
	}

	/**
	 * 채팅방 삭제하는 함수
	 * */
	@Transactional
	public Void deleteChatting(Long chattingId) {

		Chatting chatting = validateChatting(chattingId);
		chatting.updateIsDeleted();

		return null;
	}

	/**
	 * 채팅방 수정날짜 바꾸는 함수
	 * */
	@Transactional
	public void updateUpdateAt(Long chattingId) {

		Chatting chatting = validateChatting(chattingId);

		chatting.updateUpdatedAt();
	}

	/**
	 * 사용자가 생성한 채팅방이 맞는지 검증하는 함수
	 * */
	public Chatting validateChatting(Long chattingId) {

		Optional<Chatting> chatting = chattingRepository.findByIdAndIsDeleted(chattingId, 'N');
		Integer userId = CustomUtil.getCurrentUserId();

		if (!chatting.isPresent() || !chatting.get().getProject().getOwner().getId().equals(userId)) {
			throw new BusinessException("사용자가 생성한 채팅방이 아닙니다.");
		}

		return chatting.get();
	}

}
