package com.closeai.ecoprompt.message.model.entity;

import com.closeai.ecoprompt.common.entity.BaseEntity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
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
@Table(name = "file")
public class File extends BaseEntity {

	@Id
	@Column(name = "file_id", nullable = false)
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "original_file_name", nullable = false)
	private String originalFileName;

	@Column(name = "save_file_name", nullable = false)
	private String saveFileName;

	@Column(name = "file_type", nullable = false)
	private String fileType;

	@Column(name = "message_uuid", columnDefinition = "VARCHAR(36) comment '8-4-4-4-12'")
	private String messageUUID;

	@Column(name = "sender_type", nullable = false)
	private MessageSender senderType;

	public void updateMessageUUID(String messageUUID) {
		this.messageUUID = messageUUID;
	}
}
