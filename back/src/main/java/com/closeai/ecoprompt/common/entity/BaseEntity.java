package com.closeai.ecoprompt.common.entity;

import com.closeai.ecoprompt.common.CustomUtil;
import jakarta.persistence.*;
import lombok.Getter;
import org.hibernate.annotations.Comment;

import java.time.LocalDateTime;

@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Column(name = "created_at", nullable = false)
    @Comment("생성일시")
    protected String createdAt;

    @Column(name = "updated_at", nullable = false)
    @Comment("수정일시")
    protected String updatedAt;

    @Column(name = "is_deleted", nullable = false)
    @Comment("삭제 여부")
    protected char isDeleted;

    @PrePersist
    protected void onCreate() {
        this.createdAt = CustomUtil.dateConverter(LocalDateTime.now());
        this.updatedAt = this.createdAt;
        this.isDeleted = 'N';
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = CustomUtil.dateConverter(LocalDateTime.now());
    }
    
}
