package com.closeai.ecoprompt.chatting.service;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.common.logging.AppLogger;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.repository.ChattingRepository;
import com.closeai.ecoprompt.common.exception.BusinessException;
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
	public Chatting getOrCreateChatting(Long chattingId, Integer projectId){

		if(chattingId != null){
			Chatting chatting = chattingRepository.findById(chattingId)
					.orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다."));

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

	@Transactional
	public void setChattingTitle(Long chattingId, String title){

		Chatting chatting = chattingRepository.findById(chattingId)
			.orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다."));

		updateChattingTitle(chatting, title);
	}

	@Transactional
	public void updateUpdateAt(Long chattingId){

		Chatting chatting = chattingRepository.findById(chattingId)
			.orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다."));

		chatting.updateUpdatedAt();
	}

	public Page<ChattingResponse> getChattings(Integer projectId, int page) {
		AppLogger.start(projectId + " 프로젝트의 " + page + " 페이지 조회");

		Pageable pageable = PageRequest.of(page, CHAT_PAGE_SIZE, Sort.by(Sort.Direction.DESC, "updatedAt"));
		Page<Chatting> chattingPage = chattingRepository.findByProject_Id(projectId, pageable);

		return chattingPage.map(ChattingResponse::from);
	}

	private void updateChattingTitle(Chatting chatting, String title){

		chatting.setTitle(title);
		chattingRepository.save(chatting);

	}
	
}
