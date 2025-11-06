package com.closeai.ecoprompt.bookmark.repository;

import com.closeai.ecoprompt.bookmark.model.entity.Bookmark;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookmarkRepository extends JpaRepository<Bookmark, Integer> {
}
