package com.closeai.ecoprompt.mileage.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.message.model.entity.Message;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "mileage")
public class Mileage extends BaseEntity {

    @Id
    @Column(name = "mileage_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "value", nullable = false)
    private Integer value;

    // FK: mileage.Key -> message.Key (1:1 가정)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "message_id", nullable = false)
    private Message message;
    
}
