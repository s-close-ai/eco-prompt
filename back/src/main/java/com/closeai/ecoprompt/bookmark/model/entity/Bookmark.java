package com.closeai.ecoprompt.bookmark.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.user.model.entity.User;
import jakarta.persistence.*;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "bookmark")
public class Bookmark extends BaseEntity {

    @Id
    @Column(name = "bookmark_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "url", length = 800, nullable = false)
    private String url;

    @Column(name = "description", length = 100)
    private String description;

    // FK: bookmark.user_id -> user.user_id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;
}
