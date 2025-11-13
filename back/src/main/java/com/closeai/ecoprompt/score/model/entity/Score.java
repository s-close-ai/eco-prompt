package com.closeai.ecoprompt.score.model.entity;

import org.hibernate.annotations.Comment;

import com.closeai.ecoprompt.ai.model.event.ScoreInfo;
import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.message.model.entity.Message;

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
@Table(name = "score")
public class Score extends BaseEntity {

	@Id
	@Column(name = "score_id", nullable = false)
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "total_score", nullable = false)
	private Double totalScore;

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

	public void updateScores(ScoreInfo scoreInfo) {
		this.totalScore = scoreInfo.totalScore();
		this.clarityScore = scoreInfo.clarityScore();
		this.specificityScore = scoreInfo.specificityScore();
		this.formatScore = scoreInfo.formatScore();
		this.safetyScore = scoreInfo.safetyScore();
	}

	public void resetScore() {
		this.totalScore = 0.0;
		this.clarityScore = 0.0;
		this.specificityScore = 0.0;
		this.formatScore = 0.0;
		this.safetyScore = 0.0;
	}
}
