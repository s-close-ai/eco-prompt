package com.closeai.ecoprompt.ranking.repository;

import com.closeai.ecoprompt.ranking.model.entity.Ranking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface RankingRepository extends JpaRepository<Ranking, Integer> {

    // 정확히 해당 배치 스케줄과 일치하는 랭킹(정렬: 순위 오름차)
    @Query("""
        SELECT r
        FROM Ranking r
        JOIN FETCH r.user u
        WHERE r.isDeleted = 'N'
          AND r.batchSchedule = :batchSchedule
        ORDER BY r.ranking_number ASC
    """)
    List<Ranking> findSnapshotByBatchSchedule(
            @Param("batchSchedule") String batchSchedule
    );

    // 멱등성: 동일 batchSchedule 기존 스냅샷을 soft delete
    @Modifying
    @Transactional
    @Query("""
        UPDATE Ranking r
        SET r.isDeleted = 'Y'
        WHERE r.batchSchedule = :batchSchedule
          AND r.isDeleted = 'N'
    """)
    void softDeleteByBatchSchedule(@Param("batchSchedule") String batchSchedule);
}
