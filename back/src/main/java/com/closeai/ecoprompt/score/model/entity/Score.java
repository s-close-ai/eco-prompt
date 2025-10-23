package com.closeai.ecoprompt.score.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.message.model.entity.Message;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Comment;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "score")
public class Score extends BaseEntity {

    @Id
    @Column(name = "score_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "clarity_score", nullable = false)
    @Comment("명확성")
    private Double clarityScore;

    @Column(name = "specificity_score", nullable = false)
    @Comment("구체성")
    private Double specificityScore;

    @Column(name = "format_score", nullable = false)
    @Comment("형식수준")
    private Double formatScore;

    @Column(name = "safety_score", nullable = false)
    @Comment("안정성")
    private Double safetyScore;

    // FK: score.Key -> message.Key (1:1 가정)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;
}
