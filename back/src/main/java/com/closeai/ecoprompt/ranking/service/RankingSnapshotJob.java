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

import java.time.LocalDate;
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

    private static final DateTimeFormatter CREATED_FMT = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");
    private static final DateTimeFormatter BATCH_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PersistenceContext
    private EntityManager em; // User 참조를 지연 로딩/프록시로 안전하게 잡기 위함

    /**
     * 매일 00:05 (KST) 실행.
     * 대상: "어제 00:00:00 ~ 23:59:59" 구간 Top10 → 스냅샷 저장.
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Seoul")
    @Transactional
    public void snapshotYesterday() {
        LocalDate today = LocalDate.now();
        LocalDate targetDay = today.minusDays(1);          // 스냅샷 대상 일자
        LocalDate prevDay = targetDay.minusDays(1);      // 변동 비교용 전일

        // 쿼리 문자열: 00:00:00 ~ 23:59:59
        String startStr = targetDay.atStartOfDay().format(CREATED_FMT);
        String endStr = targetDay.atTime(23, 59, 59).format(CREATED_FMT);

        // 스냅샷 키(yyyy-MM-dd)
        String batchKey = targetDay.format(BATCH_FMT);
        String prevBatchKey = prevDay.format(BATCH_FMT);

        log.info("[RankingSnapshotJob] targetDay={}, start={}, end={}, batchKey={}",
                targetDay, startStr, endStr, batchKey);

        // 1) 대상 일자 Top10 조회
        List<DailyRankingProjection> top10 =
                messageJpaRepository.findTodayTop10WithName(startStr, endStr);

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
            if (prevRank == null) {
                change = RankingChange.NEW;
            } else if (prevRank > rank) {
                change = RankingChange.UP;
            } else if (prevRank < rank) {
                change = RankingChange.DOWN;
            } else {
                change = RankingChange.KEEP;
            }

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
    }
}