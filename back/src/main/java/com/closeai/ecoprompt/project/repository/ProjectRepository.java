package com.closeai.ecoprompt.project.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.project.model.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {
	
	Optional<Project> findById(Integer id);
	List<Project> findAllByOwner_Id(Integer userId);
	
}