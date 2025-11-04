package com.closeai.ecoprompt.userinfo.service;

import com.closeai.ecoprompt.common.CustomUtil;
import org.springframework.stereotype.Service;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.userinfo.model.dto.response.SharingInformationStatusResponse;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;

import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class UserInfoService {

	private final UserInfoRepository userInfoRepository;

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

    public SharingInformationStatusResponse getSharingInformationStatus() {
        AppLogger.start("정보 제공 동의 상태 조회");

        int userId = CustomUtil.getCurrentUserId();
        return SharingInformationStatusResponse.from(
                userInfoRepository.findByUser_Id(userId)
                    .orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."))
        );
    }

    public String getPersonalPrompt(Integer userId){

        UserInfo userInfo = userInfoRepository.getPersonalPromptByUserId(userId)
                .orElseThrow(() -> new BusinessException("사용자 정보 조회에 실패했습니다"));

        return userInfo.getPersonalPrompt();
    }
}
