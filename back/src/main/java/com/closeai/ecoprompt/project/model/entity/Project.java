package com.closeai.ecoprompt.project.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.user.model.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "project")
public class Project extends BaseEntity {

    @Id
    @Column(name = "project_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "title", length = 100)
    private String title;

    // FK: project.user_id -> user.user_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    public static Project of(String title, User owner) {
        return Project.builder()
                .title(title)
                .owner(owner)
                .build();
    }

    public void updateTitle(String title) {
        this.title = title;
    }

    public void deleteProject() {
        this.isDeleted = 'Y';
    }
    
}
