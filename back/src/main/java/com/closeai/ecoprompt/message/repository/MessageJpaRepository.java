package com.closeai.ecoprompt.message.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

public interface MessageJpaRepository extends JpaRepository<Message, Long> {

	Optional<Message> findByMessageUUIDAndSenderType(String messageUUID, MessageSender senderType);
	Optional<Message> findTopByChatting_IdOrderByCreatedAtDesc(Long chattingId);

}