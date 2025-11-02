package com.closeai.ecoprompt.userinfo.model.entity;

import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.user.model.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@Entity
@Table(name = "user_info")
public class UserInfo extends BaseEntity {

    @Id
    @Column(name = "user_info_id", nullable = false)
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "total_mileage", nullable = false)
    private Integer totalMileage = 0;

    @Column(name = "high_score", nullable = false)
    private Double highScore = 0.0;

    @Column(name = "personal_prompt", length = 1000)
    private String personalPrompt;

    @Column(name = "sharing_information", length = 1, nullable = false, columnDefinition = "VARCHAR(1) DEFAULT 'N'")
    private String sharingInformation = "N";  // 기본값 N

    @Column(name = "sharing_information_updated_at", nullable = false)
    private String sharingInformationUpdatedAt;

    @Column(name = "sharing_prompt", length = 1, nullable = false, columnDefinition = "VARCHAR(1) DEFAULT 'N'")
    private String sharingPrompt = "N";  // 기본값 N

    // FK: user_info.user_id -> user.user_id (1:1 가정)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    private UserInfo(Integer totalMileage, Double highScore, User user) {
        this.totalMileage = totalMileage;
        this.user = user;
        this.sharingInformationUpdatedAt = CustomUtil.dateConverter(LocalDateTime.now());
    }

    public static UserInfo makeDefaultUserInfo(User user) {

        return new UserInfo(
                0,
                0.0,
                user
        );
    }

    public void updateSharingInformationUpdatedAt() {
        this.sharingInformationUpdatedAt = CustomUtil.dateConverter(LocalDateTime.now());
    }

}
