package com.closeai.ecoprompt.score.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.score.model.entity.Score;
import com.closeai.ecoprompt.score.repository.ScoreRepository;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScoreService {

	private final UserInfoService userInfoService;

	private final ScoreRepository scoreRepository;

	/**
	 * messageId에 해당하는 점수 값이 있다면 점수 변경
	 * 아닌 경우에는 새로 생성 후 저장
	 * */
	@Transactional
	public void saveOrUpdateScore(Message message, Integer userId, ScoreInfo scoreInfo) {

		Long messageId = message.getId();
		Double newTotalScore = scoreInfo.totalScore();

		scoreRepository.findByMessage_Id(messageId)
			.ifPresentOrElse(
				score -> {
					Double oriTotalScore = score.getTotalScore();

					score.updateScores(scoreInfo);
					scoreRepository.save(score);

					userInfoService.recalculateAndUpdateHighScore(userId, oriTotalScore, newTotalScore);
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

					userInfoService.recalculateAndUpdateHighScore(userId, 0.0, newTotalScore);
				}
			);
	}

	@Transactional
	public void rollbackScore(Message message, Integer userId, ScoreInfo scoreInfo) {

		Long messageId = message.getId();
		Double oldTotalScore = scoreInfo.totalScore();

		scoreRepository.findByMessage_Id(messageId)
			.ifPresent(score -> {
				userInfoService.recalculateAndUpdateHighScore(userId, oldTotalScore, 0.0);

				score.resetScore();
				scoreRepository.save(score);
			});
	}
}