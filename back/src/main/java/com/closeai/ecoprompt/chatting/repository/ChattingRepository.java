package com.closeai.ecoprompt.chatting.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.chatting.model.entity.Chatting;

public interface ChattingRepository extends JpaRepository<Chatting, Long> {

    // 프로젝트별 채팅을 페이지네이션 + 정렬
    Page<Chatting> findByProject_Id(Integer projectId, Pageable pageable);

}