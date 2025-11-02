package com.closeai.ecoprompt.userinfo.service;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.userinfo.model.dto.response.SharingInformationStatusResponse;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Transactional(readOnly = true)
@Service
@RequiredArgsConstructor
public class UserInfoService {

    private final UserInfoRepository userInfoRepository;

    @Transactional
    public SharingInformationStatusResponse toggleSharingInformation(int userId) {
        AppLogger.start("정보 제공 동의 상태 변경");

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

    public SharingInformationStatusResponse getSharingInformationStatus(Integer userId) {
        AppLogger.start("정보 제공 동의 상태 조회");

        return SharingInformationStatusResponse.from(
                userInfoRepository.findByUserId(userId)
                    .orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."))
        );
    }
}
