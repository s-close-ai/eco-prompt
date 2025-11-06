package com.closeai.ecoprompt.bookmark.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.closeai.ecoprompt.bookmark.model.entity.Bookmark;

public interface BookmarkRepository extends JpaRepository<Bookmark, Integer> {

	long countByOwnerIdAndIsDeleted(Integer userId, char isDeleted);

	@Query("SELECT COALESCE(MAX(b.sequence), 0) FROM Bookmark b WHERE b.owner.id = :userId")
	Integer findMaxSequenceByUserId(@Param("userId") Integer userId);
	
	Optional<Bookmark> findById(Long id);
}
