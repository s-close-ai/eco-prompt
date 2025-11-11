package com.closeai.ecoprompt.ranking.service;

import com.closeai.ecoprompt.message.model.dto.response.DailyRankingProjection;
import com.closeai.ecoprompt.message.repository.MessageJpaRepository;
import com.closeai.ecoprompt.ranking.model.entity.Ranking;
import com.closeai.ecoprompt.ranking.model.entity.RankingChange;
import com.closeai.ecoprompt.ranking.repository.RankingRepository;
import com.closeai.ecoprompt.user.model.entity.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class RankingSnapshotJob {

    private final MessageJpaRepository messageJpaRepository;
    private final RankingRepository rankingRepository;

    private static final ZoneId Z_KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter CREATED_FMT_UTC =
            DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss").withZone(ZoneOffset.UTC);
    private static final DateTimeFormatter BATCH_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PersistenceContext
    private EntityManager em;

    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public Void snapshotYesterday() {
        // 반드시 KST 기준으로 '오늘/어제' 계산
        LocalDate todayKst = LocalDate.now(Z_KST);
        LocalDate targetDayKst = todayKst.minusDays(1);
        LocalDate prevDayKst = targetDayKst.minusDays(1);

        // KST의 하루 경계를 UTC Instant로 변환
        ZonedDateTime kstStart = targetDayKst.atStartOfDay(Z_KST);
        ZonedDateTime kstEnd   = targetDayKst.atTime(23, 59, 59).atZone(Z_KST);

        Instant startUtc = kstStart.toInstant(); // 어제 00:00:00 KST -> UTC
        Instant endUtc   = kstEnd.toInstant();   // 어제 23:59:59 KST -> UTC

        // 기존 레포지토리 포맷(String)으로 변환하되, 반드시 UTC로 포맷
        String startStrUtc = CREATED_FMT_UTC.format(startUtc);
        String endStrUtc   = CREATED_FMT_UTC.format(endUtc);

        String batchKey = targetDayKst.format(BATCH_FMT);
        String prevBatchKey = prevDayKst.format(BATCH_FMT);

        log.info("[RankingSnapshotJob] KST targetDay={}, KST[{} ~ {}], UTC[{} ~ {}], batchKey={}",
                targetDayKst,
                kstStart, kstEnd,
                startStrUtc, endStrUtc,
                batchKey);

        // 1) 대상 일자 Top10 조회 (UTC 문자열 범위)
        List<DailyRankingProjection> top10 =
                messageJpaRepository.findTodayTop10WithName(startStrUtc, endStrUtc);

        // 2) 전일 스냅샷으로 순위 변동 계산
        Map<Integer, Integer> prevRankMap = rankingRepository.findSnapshotByBatchSchedule(prevBatchKey)
                .stream()
                .collect(Collectors.toMap(
                        r -> r.getUser().getId(),
                        Ranking::getRankingNumber
                ));

        // 3) 멱등성: 기존 스냅샷 soft delete 후 재삽입
        rankingRepository.softDeleteByBatchSchedule(batchKey);

        // 4) 엔티티 변환 및 저장
        int rank = 1;
        List<Ranking> toSave = new ArrayList<>(top10.size());
        for (DailyRankingProjection row : top10) {
            Integer userId = row.getUserId();

            RankingChange change;
            Integer prevRank = prevRankMap.get(userId);
            if (prevRank == null)       change = RankingChange.NEW;
            else if (prevRank > rank)   change = RankingChange.UP;
            else if (prevRank < rank)   change = RankingChange.DOWN;
            else                        change = RankingChange.KEEP;

            User userRef = em.getReference(User.class, userId);

            toSave.add(Ranking.builder()
                    .rankingNumber(rank++)
                    .rankingChange(change)
                    .batchSchedule(batchKey)
                    .user(userRef)
                    .score(Optional.ofNullable(row.getMaxScore()).orElse(0.0))
                    .mileage(Optional.ofNullable(row.getMileageSum()).orElse(0))
                    .promptCount(Optional.ofNullable(row.getPromptCount()).orElse(0))
                    .build());
        }

        rankingRepository.saveAll(toSave);
        log.info("[RankingSnapshotJob] snapshot saved. size={}, batchKey={}", toSave.size(), batchKey);

        return null;
    }
}