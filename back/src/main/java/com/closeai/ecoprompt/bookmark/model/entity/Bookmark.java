package com.closeai.ecoprompt.bookmark.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;
import com.closeai.ecoprompt.user.model.entity.User;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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

	@Column(name = "sequence")
	private Integer sequence;

	// FK: bookmark.user_id -> user.user_id
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "user_id", nullable = false)
	private User owner;

	public void updateIsDelete() {
		this.isDeleted = 'Y';
	}

	public void updateTitle(String title) {
		this.title = title;
	}

	public void updateUrl(String url) {
		this.url = url;
	}

	public void updateDescription(String description) {
		this.description = description;
	}

	public void updateSequence(Integer sequence) {
		this.sequence = sequence;
	}
}
