package com.closeai.ecoprompt.mileage.service;

import org.springframework.stereotype.Service;

import com.closeai.ecoprompt.message.model.entity.Message;
import com.closeai.ecoprompt.mileage.model.entity.Mileage;
import com.closeai.ecoprompt.mileage.repository.MileageRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MileageService {

	private final MileageRepository mileageRepository;

	// 마일리지 기본 배율 (10)
	private static final int MILEAGE_UNIT = 10;

	public void saveOrUpdateMileage(Message message, Double score){

		int value = calculateMileage(score);
		Long messageId = message.getId();

		Mileage mileage = mileageRepository.findByMessage_Id(messageId).orElse(null);

		// DB에 저장된 마일리지가 없다면 새로 생성
		if(mileage == null){
			mileage = Mileage.builder()
				.message(message)
				.value(value)
				.build();
		}
		else {	// DB에 저장된 마일리지가 있다면 값을 수정
			int preValue = mileage.getValue();
			if(preValue != value){
				mileage.updateValue(value);
			}
		}

		mileageRepository.save(mileage);
	}

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
