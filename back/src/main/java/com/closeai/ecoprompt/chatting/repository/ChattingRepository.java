package com.closeai.ecoprompt.chatting.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.chatting.model.entity.Chatting;

public interface ChattingRepository extends JpaRepository<Chatting, Long> {

}
