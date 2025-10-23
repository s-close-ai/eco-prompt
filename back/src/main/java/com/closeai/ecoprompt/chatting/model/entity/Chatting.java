package com.closeai.ecoprompt.chatting.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.project.model.entity.Project;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "chatting")
public class Chatting extends BaseEntity {

    @Id
    @Column(name = "chatting_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", length = 100)
    private String title;

    // FK: chatting.project_id -> project.project_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;
}
