package com.closeai.ecoprompt.dashboard.service;

import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.dashboard.model.dto.response.DashboardDetailScoreResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.DetailScoreResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.EcoPickResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.PersonalStateResponse;
import com.closeai.ecoprompt.message.model.entity.MessageSender;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.repository.mongo.MessageMongoRepository;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DashboardService {

    private final UserInfoRepository userInfoRepository;
    private final MessageJpaRepository messageJpaRepository;
    private final MessageMongoRepository messageMongoRepository;

    public PersonalStateResponse getRecord() {
        AppLogger.start("개인의 기록 통계 불러오기");

        int userId = CustomUtil.getCurrentUserId();
        UserInfo userInfo = userInfoRepository.findById(userId).orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."));

        AppLogger.info(userInfo.toString(), userId);

        return PersonalStateResponse.from(userInfo);
    }

    public DashboardDetailScoreResponse getDetailScore() {
        AppLogger.start("개인과 전체 각각에 대한 평균 점수 불러오기");

        int userId = CustomUtil.getCurrentUserId();
        DetailScoreResponse averageScoresByUserAllTime = messageJpaRepository.findAverageScoresByUserAllTime(userId);
        DetailScoreResponse averageScoresAllUsersAllTime = messageJpaRepository.findAverageScoresAllUsersAllTime();

        return new DashboardDetailScoreResponse(averageScoresByUserAllTime, averageScoresAllUsersAllTime);
    }

    public List<EcoPickResponse> getEcoPick() {
        AppLogger.start("에코픽 조회 시작");

        ZonedDateTime kstStart = LocalDate.now(ZoneId.of("Asia/Seoul")).minusDays(1).atStartOfDay(ZoneId.of("Asia/Seoul"));
        ZonedDateTime kstEnd   = kstStart.plusDays(1).minusSeconds(1);

        DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss").withZone(ZoneOffset.UTC);
        String startUtc = FMT.format(kstStart.toInstant());
        String endUtc   = FMT.format(kstEnd.toInstant());

        return messageJpaRepository.findDailyEcoPicksTop3(startUtc, endUtc).stream()
                .map(p -> {
                    // 1) Mongo에서 messageUUID로 프롬프트 본문 조회
                    String prompt = messageMongoRepository.findByMessageUUIDAndSenderType(p.getMessageUUID(), MessageSender.USER)
                            .orElseThrow(() -> new BusinessException("해당하는 메시지가 없습니다."))
                            .getContent();

                    // 2) 최종 응답 DTO 구성
                    return new EcoPickResponse(
                            p.getName(),
                            p.getSumOfScore(),
                            prompt,
                            new DetailScoreResponse(
                                    p.getClarityScore(),
                                    p.getSpecificityScore(),
                                    p.getFormatScore(),
                                    p.getSafetyScore()
                            )
                    );
                })
                .toList();
    }
}
