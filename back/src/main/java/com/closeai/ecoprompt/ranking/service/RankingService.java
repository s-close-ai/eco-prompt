package com.closeai.ecoprompt.ranking.service;

import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.config.RedisCacheConfig;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.message.model.dto.response.DailyRankingProjection;
import com.closeai.ecoprompt.ranking.model.dto.response.RankingResponse;
import com.closeai.ecoprompt.ranking.model.dto.response.TodayRankingResponse;
import com.closeai.ecoprompt.ranking.model.entity.Ranking;
import com.closeai.ecoprompt.ranking.model.entity.RankingChange;
import com.closeai.ecoprompt.ranking.repository.RankingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class RankingService {

    private final RankingRepository rankingRepository;
    private final MessageJpaRepository messageJpaRepository;

    private static final DateTimeFormatter CREATED_FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");
    private static final DateTimeFormatter SNAPSHOT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final ZoneId UTC = ZoneOffset.UTC;

    /**
     * 오늘 Top10을 집계하고, 어제(00:00:00) 스냅샷과 비교하여 RankingChange를 계산.
     *
     * @return 오늘 Top10 RankingResponse(NEW/UP/DOWN/KEEP 포함)
     */
    @Cacheable(
            value = RedisCacheConfig.TODAY_TOP10_CACHE,
            key   = "'today'",
            unless = "#result == null || #result.isEmpty()"
    )
    public TodayRankingResponse getTodayTop10WithChange() {
        AppLogger.start("오늘의 실시간 랭킹 조회");

//        // 1) 현재 시간 KST
//        LocalDateTime nowKst = LocalDateTime.now(KST);
//
//        // 2) 오늘 KST 00:00
//        LocalDateTime startOfDayKst = nowKst.toLocalDate().atStartOfDay();
//
//        // 3) KST → UTC 변환
//        LocalDateTime startUtc = startOfDayKst.atZone(KST).withZoneSameInstant(UTC).toLocalDateTime();
//        LocalDateTime nowUtc    = nowKst.atZone(KST).withZoneSameInstant(UTC).toLocalDateTime();
//
//        // 4) DB 포맷으로 변환
//        String startStr = startUtc.format(CREATED_FMT);
//        String nowStr   = nowUtc.format(CREATED_FMT);
//
//        // 5) 오늘 Top10 조회
//        List<DailyRankingProjection> today =
//                messageJpaRepository.findTodayTop10WithName(startStr, nowStr);
//
//        // ============================
//        // 어제 스냅샷 조회도 KST 기준
//        // ============================
//
//        LocalDate yesterdayKst = nowKst.toLocalDate().minusDays(1);
//
//        // 어제 KST 00:00을 UTC 로 변환
//        LocalDateTime yesterdayKstMidnight = yesterdayKst.atStartOfDay();
//        LocalDateTime yesterdayUtcMidnight =
//                yesterdayKstMidnight.atZone(KST).withZoneSameInstant(UTC).toLocalDateTime();
//
//        // SNAPSHOT_FMT yyyy-MM-dd
//        String yesterdayBatch = yesterdayUtcMidnight.toLocalDate().format(SNAPSHOT_FMT);


        // 1) 현재 시간 (KST 기준)
        ZonedDateTime nowKst = ZonedDateTime.now(KST);

        // 2) 오늘 00:00 (KST 기준)
        ZonedDateTime startOfDayKst = nowKst.toLocalDate().atStartOfDay(KST);

        // 3) KST → UTC 변환
        ZonedDateTime startUtc = startOfDayKst.withZoneSameInstant(UTC);
        ZonedDateTime nowUtc   = nowKst.withZoneSameInstant(UTC);

        // 4) DB(created_at)에서 사용하는 포맷으로 변환
        String startStr = startUtc.toLocalDateTime().format(CREATED_FMT);
        String nowStr   = nowUtc.toLocalDateTime().format(CREATED_FMT);

        log.info("KST today[00:00~now] => UTC[{} ~ {}]", startStr, nowStr);

        // 5) 오늘 Top10 조회 (UTC 문자열 구간)
        List<DailyRankingProjection> today =
                messageJpaRepository.findTodayTop10WithName(startStr, nowStr);

        // ============================================
        // 어제 스냅샷 조회도 동일 — 변환 없이 그대로
        // ============================================

        LocalDate yesterday = nowKst.toLocalDate().minusDays(1);

        // 어제 00:00 그대로 사용
        String yesterdayBatch = yesterday.format(SNAPSHOT_FMT);
        log.info("yesterday Batch: {}", yesterdayBatch);

        List<Ranking> ySnapshot = rankingRepository.findSnapshotByBatchSchedule(yesterdayBatch);

        // 4) 어제 순위 맵(userId -> rank)
        Map<Integer, Integer> prevRankMap = new HashMap<>();
        for (Ranking r : ySnapshot) {
            prevRankMap.put(r.getUser().getId(), r.getRankingNumber());
        }

        // 5) 오늘 순위 + 변동 계산
        List<RankingResponse> result = new ArrayList<>();
        int rank = 1;
        for (DailyRankingProjection row : today) {
            Integer userId = row.getUserId();
            Integer prevRank = prevRankMap.get(userId);

            RankingChange change;
            if (prevRank == null) {
                change = RankingChange.NEW;
            } else if (prevRank > rank) {
                change = RankingChange.UP;
            } else if (prevRank < rank) {
                change = RankingChange.DOWN;
            } else {
                change = RankingChange.KEEP;
            }

            result.add(new RankingResponse(
                    rank++,
                    row.getEmployeeNumber() + " " + row.getName(),
                    Math.round(row.getMaxScore() * 100) / 100.0,
                    row.getMileageSum(),
                    row.getPromptCount(),
                    change
            ));
        }
        return new TodayRankingResponse(result, CustomUtil.dateConverter(LocalDateTime.now()));
    }

    /**
     * "yyyy.MM.dd" 문자열로 들어온 날짜의 스냅샷(00:00:00)을 조회
     */
    @Cacheable(
            value = RedisCacheConfig.SNAPSHOT_CACHE,
            key   = "#date.toString()", // 예: "2025-11-04"
            unless = "#result == null || #result.isEmpty()"
    )
    public List<RankingResponse> getSnapshotByDate(LocalDate date) {
        AppLogger.start(date + " 의 랭킹 스냅샷 조회");
        // 1) 날짜 파싱 및 00:00:00 세팅
        String batchSchedule = LocalDateTime.of(date, LocalTime.MIDNIGHT).format(SNAPSHOT_FMT); // yyyy-MM-dd

        // 2) 스냅샷 조회
        List<Ranking> rows = rankingRepository.findSnapshotByBatchSchedule(batchSchedule);

        // 3) RankingResponse로 변환 (스냅샷 표시용: change는 KEEP로 고정)
        List<RankingResponse> result = new ArrayList<>();
        for (Ranking r : rows) {
            result.add(new RankingResponse(
                    r.getRankingNumber(),
                    r.getUser().getEmployeeNumber() + " " + r.getUser().getName(),
                    Math.round(r.getScore() * 100) / 100.0,
                    r.getMileage(),
                    r.getPromptCount(),
                    r.getRankingChange()
            ));
        }
        return result;
    }

}
