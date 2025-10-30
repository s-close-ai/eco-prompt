package com.closeai.ecoprompt.score.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.dto.ScoreInfo;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.message.service.MessageService;
import com.closeai.ecoprompt.score.model.entity.Score;
import com.closeai.ecoprompt.score.repository.ScoreRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScoreService {

	private final ScoreRepository scoreRepository;

	public void saveScore(Message message, ScoreInfo scoreInfo) {
		Score score = Score.builder()
			.totalScore(scoreInfo.getTotalScore())
			.clarityScore(scoreInfo.getClarityScore())
			.specificityScore(scoreInfo.getSpecificityScore())
			.formatScore(scoreInfo.getFormatScore())
			.safetyScore(scoreInfo.getSafetyScore())
			.message(message)
			.build();

		scoreRepository.save(score);
	}

}