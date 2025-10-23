package com.closeai.ecoprompt.message.model.entity;

import com.closeai.ecoprompt.chatting.model.entity.Chatting;
import com.closeai.ecoprompt.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "message")
public class Message extends BaseEntity {

    @Id
    @Column(name = "message_id", nullable = false) // 컬럼명이 Key
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // '사용자 || ai' → enum
    @Enumerated(EnumType.STRING)
    @Column(name = "sender_type", nullable = false) // 원 컬럼명 유지
    private MessageSender senderType;

    @Column(name = "uuid", columnDefinition = "VARCHAR(36) comment '8-4-4-4-12'")
    private String uuid;

    // FK: message.chatting_id -> chatting.chatting_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chatting_id", nullable = false)
    private Chatting chatting;
}
