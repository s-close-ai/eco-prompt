package com.closeai.ecoprompt.message.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.message.model.entity.Message;

public interface MessageJpaRepository extends JpaRepository<Message, Long> {

	Optional<Message> findByMessageUUID(String messageUUID);

}