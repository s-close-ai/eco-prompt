package com.closeai.ecoprompt.project.service;

import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.project.model.dto.response.PersonalProjectResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.project.model.entity.Project;
import com.closeai.ecoprompt.project.repository.ProjectRepository;

import lombok.RequiredArgsConstructor;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ProjectService {

    private final ProjectRepository projectRepository;

    public Project getProject(Integer projectId) {
        return projectRepository.findById(projectId)
                .orElseThrow(() -> new BusinessException("프로젝트를 찾을 수 없습니다."));
    }

    public List<PersonalProjectResponse> getPersonalProject(int userId) {
		AppLogger.info("개인 프로젝트 리스트 조회", userId);

        return projectRepository.findAllByOwner_Id(userId).stream()
                .map(PersonalProjectResponse::from)
                .toList();
    }
}