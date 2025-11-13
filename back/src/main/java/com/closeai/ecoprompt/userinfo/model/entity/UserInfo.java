package com.closeai.ecoprompt.userinfo.model.entity;

import java.time.LocalDateTime;

import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.user.model.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
	private String personalPrompt = "";

	@Column(name = "sharing_information", length = 1, nullable = false, columnDefinition = "VARCHAR(1) DEFAULT 'N'")
	private String sharingInformation = "N";  // 기본값 N

	@Column(name = "sharing_information_updated_at", nullable = false)
	private String sharingInformationUpdatedAt;

	@Column(name = "sharing_prompt", length = 1, nullable = false, columnDefinition = "VARCHAR(1) DEFAULT 'N'")
	private char sharingPrompt = 'N';  // 기본값 N

	@Column(name = "total_prompt_count", nullable = false)
	private Long totalPromptCount = 0L;

	@Column(name = "total_score", nullable = false)
	private Double totalScore = 0.0;

	@Column(name = "total_fail_count", nullable = false)
	private Long totalFailCount = 0L;

	// FK: user_info.user_id -> user.user_id (1:1 가정)
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User user;

	private UserInfo(Integer totalMileage, Double highScore, Long totalPromptCount, Double totalScore, User user) {
		this.totalMileage = totalMileage;
		this.highScore = highScore;
		this.totalPromptCount = totalPromptCount;
		this.totalScore = totalScore;
		this.user = user;
		this.sharingInformationUpdatedAt = CustomUtil.dateConverter(LocalDateTime.now());
	}

	public static UserInfo makeDefaultUserInfo(User user) {

		return new UserInfo(
			0,
			0.0,
			0L,
			0.0,
			user
		);
	}

	public void updateSharingInformationUpdatedAt() {
		this.sharingInformationUpdatedAt = CustomUtil.dateConverter(LocalDateTime.now());
	}

	public void updateTotalPromptCount() {
		this.totalPromptCount++;
	}

	public void updateHighScore(Double highScore) {
		this.highScore = highScore;
	}

	public void updateTotalMileage(Integer value) {
		this.totalMileage = this.totalMileage + value;
	}

	public void updateTotalScore(Double score) {
		this.totalScore += score;
	}

	public void updatePersonalPrompt(String personalPrompt) {
		this.personalPrompt = personalPrompt;
	}

	public void updateTotalFailCount(Long value) {
		this.totalFailCount = value;
	}

}
