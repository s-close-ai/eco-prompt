package com.closeai.ecoprompt.message.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.message.model.entity.File;

public interface FileRepository extends JpaRepository<File, Long> {
}
