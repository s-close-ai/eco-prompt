package com.closeai.ecoprompt.project.service;

import org.springframework.stereotype.Service;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.project.model.entity.Project;
import com.closeai.ecoprompt.project.repository.ProjectRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ProjectService {

	private final ProjectRepository projectRepository;

	@Transactional
	public Project getProject(Integer projectId){
		return projectRepository.findById(projectId)
			.orElseThrow(() -> new BusinessException("프로젝트를 찾을 수 없습니다."));
	}

}