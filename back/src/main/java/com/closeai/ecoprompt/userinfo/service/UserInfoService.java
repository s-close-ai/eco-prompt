package com.closeai.ecoprompt.userinfo.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.score.repository.ScoreRepository;
import com.closeai.ecoprompt.userinfo.model.dto.request.UpdatePersonalPromptRequest;
import com.closeai.ecoprompt.userinfo.model.dto.response.GetUserInfoResponse;
import com.closeai.ecoprompt.userinfo.model.dto.response.SharingInformationStatusResponse;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserInfoService {

	private final UserInfoRepository userInfoRepository;
	private final ScoreRepository scoreRepository;

	/**
	 * 정보 제공 동의 상태 변환 함수
	 */
	@Transactional
	public SharingInformationStatusResponse toggleSharingInformation() {
		AppLogger.start("정보 제공 동의 상태 변경");

		int userId = CustomUtil.getCurrentUserId();
		UserInfo userInfo = userInfoRepository.findById(userId)
			.orElseThrow(() -> new BusinessException("해당하는 사용자가 없습니다."));

		if (userInfo.getSharingInformation().equals("Y")) {
			userInfo.setSharingInformation("N");

			AppLogger.info("정보 제공 상태: Y -> N", userId);
		} else if (userInfo.getSharingInformation().equals("N")) {
			userInfo.setSharingInformation("Y");

			AppLogger.info("정보 제공 상태: N -> Y", userId);
		}
		userInfo.updateSharingInformationUpdatedAt();

		userInfoRepository.save(userInfo);

		AppLogger.complete("정보 제공 동의 상태 변경 @" + userInfo.getSharingInformationUpdatedAt());

		return SharingInformationStatusResponse.from(userInfo);
	}

	/**
	 * 정보 제공 동의 상태 조회 함수
	 */
	public SharingInformationStatusResponse getSharingInformationStatus() {
		AppLogger.start("정보 제공 동의 상태 조회");

		int userId = CustomUtil.getCurrentUserId();
		return SharingInformationStatusResponse.from(
			userInfoRepository.findByUser_Id(userId)
				.orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."))
		);
	}

	/**
	 * 사용자 지침 수정 API 함수
	 * */
	@Transactional
	public Void updatePersonalPrompt(UpdatePersonalPromptRequest request) {

		String personalPrompt = request.personalPrompt();
		Integer userId = CustomUtil.getCurrentUserId();

		UserInfo userInfo = getUserInfo(userId);
		userInfo.updatePersonalPrompt(personalPrompt);

		return null;
	}

	/**
	 *
	 * */
	public GetUserInfoResponse getUserPromptInfo() {

		Integer userId = CustomUtil.getCurrentUserId();

		UserInfo userInfo = getUserInfo(userId);
		return new GetUserInfoResponse(userInfo.getSharingPrompt(),
			userInfo.getPersonalPrompt());
	}

	/**
	 * 사용자 프롬프트 조회 함수
	 */
	public String getPersonalPrompt(Integer userId) {

		UserInfo userInfo = getUserInfo(userId);

		return userInfo.getPersonalPrompt() == null ? "" : userInfo.getPersonalPrompt();
	}

	/**
	 * 사용자 프롬프트 상태 변경 API 함수
	 * */
	@Transactional
	public Void updateSharingPrompt() {

		Integer userId = CustomUtil.getCurrentUserId();
		UserInfo userInfo = getUserInfo(userId);

		if (userInfo.getSharingPrompt() == 'Y') {
			userInfo.setSharingPrompt('N');
		} else if (userInfo.getSharingPrompt() == 'N') {
			userInfo.setSharingPrompt('Y');
		}

		return null;
	}

	/**
	 * 사용자에 대한 프롬프트 수 증가
	 */
	@Transactional
	public void increasePromptCnt(Integer userId) {

		UserInfo userInfo = getUserInfo(userId);
		userInfo.updateTotalPromptCount();
	}

	/**
	 * 사용자의 최고 점수를 수정하는 함수
	 */
	@Transactional
	public void recalculateAndUpdateHighScore(Integer userId, Double oriTotalScore, Double newTotalScore) {

		UserInfo userInfo = getUserInfo(userId);
		Double curHighScore = userInfo.getHighScore();

		userInfo.updateTotalScore(newTotalScore - oriTotalScore);

		// 새로운 점수가 현재 최고 점수보다 높은 경우
		if (newTotalScore > curHighScore) {
			userInfo.updateHighScore(newTotalScore);
		} else if (curHighScore.equals(oriTotalScore) && newTotalScore < oriTotalScore) {
			Double newCalHighScore = scoreRepository.findMaxTotalScoreByUserId(userId).orElse(0.0);

			userInfo.updateHighScore(newCalHighScore);
		}

		userInfoRepository.save(userInfo);
	}

	/**
	 * 총 마일리지를 업데이트 하는 함수
	 */
	@Transactional
	public void updateTotalMileage(Integer userId, int oldValue, int newValue) {

		UserInfo userInfo = getUserInfo(userId);
		int gapValue = newValue - oldValue;

		userInfo.updateTotalMileage(gapValue);
	}

	private UserInfo getUserInfo(Integer userId) {
		return userInfoRepository.findByUser_Id(userId)
			.orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."));
	}
}
