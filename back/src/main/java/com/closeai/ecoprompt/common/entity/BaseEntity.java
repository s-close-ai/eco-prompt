package com.closeai.ecoprompt.common.entity;

import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "created_at", nullable = false)
    @Comment("생성일시")
    protected String createdAt;

    @Column(name = "updated_at", nullable = false)
    @Comment("수정일시")
    protected String updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = dateConverter(LocalDateTime.now());
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = dateConverter(LocalDateTime.now());
    }

    private String dateConverter(LocalDateTime time) {
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy.MM.dd.HH.mm.ss");
        return time.format(formatter);
    }
    
}
