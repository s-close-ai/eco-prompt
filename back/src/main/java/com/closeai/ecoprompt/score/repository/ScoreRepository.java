package com.closeai.ecoprompt.score.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.closeai.ecoprompt.score.model.entity.Score;

public interface ScoreRepository extends JpaRepository<Score, Long> {

}