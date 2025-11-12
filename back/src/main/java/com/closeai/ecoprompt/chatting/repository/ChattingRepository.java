package com.closeai.ecoprompt.chatting.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.closeai.ecoprompt.chatting.model.entity.Chatting;

public interface ChattingRepository extends JpaRepository<Chatting, Long> {

	// 프로젝트별 채팅을 페이지네이션 + 정렬
	Page<Chatting> findByProject_IdAndIsDeleted(Integer projectId, char isDeleted, Pageable pageable);

	Optional<Chatting> findByIdAndIsDeleted(Long id, char isDeleted);

	@Query("SELECT c FROM Chatting c " +
		"JOIN c.project p " +
		"WHERE p.owner.id = :userId " +
		"ORDER BY c.updatedAt DESC")
	List<Chatting> findByUserIdOrderByUpdatedAtDesc(@Param("userId") Integer userId);
}