package com.closeai.ecoprompt.score.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.closeai.ecoprompt.score.model.entity.Score;

public interface ScoreRepository extends JpaRepository<Score, Long> {

	Optional<Score> findByMessage_Id(Long messageId);

	@Query("SELECT MAX(s.totalScore) FROM Score s WHERE s.message.userId = :userId")
	Optional<Double> findMaxTotalScoreByUserId(@Param("userId") Integer userId);
}