package com.closeai.ecoprompt.message.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.message.model.entity.File;

public interface FileRepository extends JpaRepository<File, Long> {
	List<File> findByMessageUUIDInAndIsDeletedFalse(List<String> messageUUIDs);

	Optional<File> getByMessageUUIDAndIsDeleted(String messageUUID, char isDeleted);
}
