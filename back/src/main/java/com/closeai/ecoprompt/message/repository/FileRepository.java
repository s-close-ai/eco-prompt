package com.closeai.ecoprompt.message.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.message.model.entity.File;

public interface FileRepository extends JpaRepository<File, Long> {
	List<File> findByMessageUUIDInAndIsDeletedFalse(List<String> messageUUIDs);
}
