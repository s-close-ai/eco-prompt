package com.closeai.ecoprompt.score.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.score.model.entity.Score;

public interface ScoreRepository extends JpaRepository<Score, Long> {

	Optional<Score> findByMessage_Id(Long messageId);
}