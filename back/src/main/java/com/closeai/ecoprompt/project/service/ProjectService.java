package com.closeai.ecoprompt.project.service;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.chatting.repository.ChattingRepository;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.project.model.dto.request.PersonalProjectRequest;
import com.closeai.ecoprompt.project.model.dto.response.PersonalProjectResponse;
import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.user.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.project.model.entity.Project;
import com.closeai.ecoprompt.project.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final ChattingRepository chattingRepository;

    private static final int CHAT_PAGE_SIZE = 20;

    public Project getProject(Integer projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException("프로젝트를 찾을 수 없습니다."));
    }

    // 프로젝트는 무조건 생성 시간 정렬해서 보내기, 최근 생성된 게 위로
    // 상위 20개 채팅방 pagenation
    // 채팅은 업데이트 시간으로 정렬해서 보내기
    public List<PersonalProjectResponse> getPersonalProject(int userId) {
		AppLogger.info("개인 프로젝트 리스트 조회", userId);

        return getPersonalProjectResponse(userId);
    }

    @Transactional
    public List<PersonalProjectResponse> saveProject(PersonalProjectRequest projectRequest) {
        AppLogger.info("프로젝트 생성 \nDATA: " + projectRequest.toString());

        User user = userRepository.findById(projectRequest.userId())
                .orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."));

        projectRepository.save(Project.of(projectRequest.title(), user));

        return getPersonalProjectResponse(projectRequest.userId());
    }

    private List<PersonalProjectResponse> getPersonalProjectResponse(int userId) {
        // 1. 유저의 모든 프로젝트 조회
        List<Project> projects = projectRepository.findAllByOwner_Id(userId);

        // 2. 채팅 페이지네이션 (updatedAt 내림차순)
        Pageable pageable = PageRequest.of(0, CHAT_PAGE_SIZE, Sort.by(Sort.Direction.DESC, "updatedAt"));

        // 3. 프로젝트별 채팅 조회 및 DTO 변환
        List<PersonalProjectResponse> responses = new ArrayList<>();
        for (Project project : projects) {
            Page<Chatting> chattingPage = chattingRepository.findByProject_Id(project.getId(), pageable);

            List<ChattingResponse> chattingResponses = chattingPage
                    .map(c -> new ChattingResponse(project.getId(), c.getTitle()))
                    .getContent();

            responses.add(PersonalProjectResponse.of(project, chattingResponses));
        }

        return responses;
    }

    public Void updateProjectTitle(int projectId, PersonalProjectRequest projectRequest) {
        AppLogger.info("UPDATE PROJECT TITLE: " + projectRequest.toString(),  projectId);

        Project project = getProject(projectId);
        if (project.getOwner().getId() != projectRequest.userId()) {
            throw new BusinessException("사용자와 프로젝트가 일치하지 않습니다.");
        }

        project.updateTitle(projectRequest.title());
        return null;
    }
}