package com.closeai.ecoprompt.project.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.project.model.entity.Project;

public interface ProjectRepository extends JpaRepository<Project, Integer> {

	Optional<Project> findByIdAndIsDeleted(Integer id, char isDeleted);

	List<Project> findAllByOwner_IdAndIsDeletedOrderByCreatedAtDesc(Integer userId, char isDeleted);

}