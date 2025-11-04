package com.closeai.ecoprompt.chatting.service;

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

	/**
	 * 채팅방 id에 해당하는 chatting이 있는 경우 반환
	 * 아니라면 새로 생성 후 반환
	 * */
	public Chatting getOrCreateChatting(Long chattingId, Integer projectId){

		if(chattingId != null){
			return chattingRepository.findById(chattingId)
				.orElseThrow(() -> new BusinessException("채팅방을 찾을 수 없습니다."));
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

	private void updateChattingTitle(Chatting chatting, String title){

		chatting.setTitle(title);
		chattingRepository.save(chatting);
	}
}
