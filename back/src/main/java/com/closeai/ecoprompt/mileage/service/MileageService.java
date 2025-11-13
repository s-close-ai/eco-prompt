package com.closeai.ecoprompt.mileage.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.mileage.model.entity.Mileage;
import com.closeai.ecoprompt.mileage.repository.MileageRepository;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MileageService {

	private final UserInfoService userInfoService;

	private final MileageRepository mileageRepository;

	// 마일리지 기본 배율 (10)
	private static final int MILEAGE_UNIT = 10;

	/**
	 * messageId에 해당하는 마일리지 값이 있다면 점수 변경
	 * 아닌 경우에는 새로 생성 후 저장
	 * */
	@Transactional
	public void saveOrUpdateMileage(Message message, Integer userId, Double score) {

		int newValue = calculateMileage(score);
		Long messageId = message.getId();

		mileageRepository.findByMessage_Id(messageId)
			.ifPresentOrElse(
				mileage -> {
					int oldValue = mileage.getValue();
					if (oldValue != newValue) {
						mileage.updateValue(newValue);
						mileageRepository.save(mileage);

						userInfoService.updateTotalMileage(userId, oldValue, newValue);
					}
				},
				() -> {
					Mileage newMileage = Mileage.builder()
						.message(message)
						.value(newValue)
						.build();
					mileageRepository.save(newMileage);

					userInfoService.updateTotalMileage(userId, 0, newValue);
				}
			);
	}

	@Transactional
	public void rollbackMileage(Message message, Integer userId, Double score) {

		Long messageId = message.getId();
		int oldValue = calculateMileage(score);

		mileageRepository.findByMessage_Id(messageId)
			.ifPresent(mileage -> {
				userInfoService.updateTotalMileage(userId, oldValue, 0);

				mileage.resetValue();
				mileageRepository.save(mileage);
			});
	}

	/**
	 * 프롬프트 점수 구간에 따른 마일리지 점수 계산
	 * */
	private int calculateMileage(double score) {

		int multiplier = 0; // 기본 배율(Multiplier)은 0으로 시작

		if (score == 100) {
			multiplier = 21;
		} else if (score >= 96) { // 96-99점 구간
			multiplier = 13;
		} else if (score >= 91) { // 91-95점 구간
			multiplier = 8;
		} else if (score >= 81) { // 81-90점 구간
			multiplier = 5;
		} else if (score >= 71) { // 71-80점 구간
			multiplier = 3;
		} else if (score >= 61) { // 61-70점 구간
			multiplier = 2;
		} else if (score >= 51) { // 51-60점 구간
			multiplier = 1;
		}

		return multiplier * MILEAGE_UNIT;
	}
}
