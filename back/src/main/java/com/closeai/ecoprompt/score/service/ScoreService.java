package com.closeai.ecoprompt.score.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.score.model.entity.Score;
import com.closeai.ecoprompt.score.repository.ScoreRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScoreService {

	private final ScoreRepository scoreRepository;

	public void saveOrUpdateScore(Message message, ScoreInfo scoreInfo) {

		Long messageId = message.getId();
		Score score = scoreRepository.findByMessage_Id(messageId).orElse(null);

		// 만약 score이 없다면 새로 생성 후 저장
		if(score == null){
			score = Score.builder()
				.totalScore(scoreInfo.totalScore())
				.clarityScore(scoreInfo.clarityScore())
				.specificityScore(scoreInfo.specificityScore())
				.formatScore(scoreInfo.formatScore())
				.safetyScore(scoreInfo.safetyScore())
				.message(message)
				.build();
		}
		else{ // 점수 값을 업데이트
			score.updateScores(scoreInfo);
		}

		scoreRepository.save(score);
	}

}