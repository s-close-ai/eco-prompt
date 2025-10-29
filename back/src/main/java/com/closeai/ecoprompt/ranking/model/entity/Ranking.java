package com.closeai.ecoprompt.ranking.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.user.model.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "ranking")
public class Ranking extends BaseEntity {

    @Id
    @Column(name = "ranking_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "ranking_number", nullable = false)
    private Integer ranking_number;

    @Enumerated(EnumType.STRING)
    @Column(name = "ranking_change", nullable = false, columnDefinition = "varchar(16) comment 'NEW, UP, DOWN, KEEP'")
    private RankingChange rankingChange;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, columnDefinition = "varchar(16) comment 'MONTHLY, WEEKLY, REALTIME'")
    private RankingType type;

    @Column(name = "batch_schedule", length = 12, nullable = false) // yyyyMMddHHmm
    private String batchSchedule;

    // FK: ranking.user_id -> user.user_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
