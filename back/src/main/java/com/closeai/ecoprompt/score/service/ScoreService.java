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

	/**
	 * messageId에 해당하는 점수 값이 있다면 점수 변경
	 * 아닌 경우에는 새로 생성 후 저장
	 * */
	public void saveOrUpdateScore(Message message, ScoreInfo scoreInfo) {

		Long messageId = message.getId();

		scoreRepository.findByMessage_Id(messageId)
			.ifPresentOrElse(
				score -> {
					score.updateScores(scoreInfo);
					scoreRepository.save(score);
				},
				() -> {
					Score newScore = Score.builder()
						.totalScore(scoreInfo.totalScore())
						.clarityScore(scoreInfo.clarityScore())
						.specificityScore(scoreInfo.specificityScore())
						.formatScore(scoreInfo.formatScore())
						.safetyScore(scoreInfo.safetyScore())
						.message(message)
						.build();
					scoreRepository.save(newScore);
				}
			);
	}
}