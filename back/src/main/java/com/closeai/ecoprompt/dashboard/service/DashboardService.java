package com.closeai.ecoprompt.dashboard.service;

import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.dashboard.model.dto.response.DashboardDetailScoreResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.DetailScoreResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.PersonalStatResponse;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final UserInfoRepository userInfoRepository;
    private final MessageJpaRepository messageJpaRepository;

    public PersonalStatResponse getRecord() {
        AppLogger.start("개인의 기록 통계 불러오기");

        int userId = CustomUtil.getCurrentUserId();
        UserInfo userInfo = userInfoRepository.findById(userId).orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."));

        AppLogger.info(userInfo.toString(), userId);
        return PersonalStatResponse.from(userInfo);
    }

    public DashboardDetailScoreResponse getDetailScore() {
        AppLogger.start("개인과 전체 각각에 대한 평균 점수 불러오기");

        int userId = CustomUtil.getCurrentUserId();
        DetailScoreResponse averageScoresByUserAllTime = messageJpaRepository.findAverageScoresByUserAllTime(userId);

        DetailScoreResponse averageScoresAllUsersAllTime = messageJpaRepository.findAverageScoresAllUsersAllTime();

        return new DashboardDetailScoreResponse(averageScoresByUserAllTime, averageScoresAllUsersAllTime);
    }
}
