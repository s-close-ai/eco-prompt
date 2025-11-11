package com.closeai.ecoprompt.common.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDateTime;

public abstract class MongoBaseEntity {

	@CreatedDate
	@Field("created_at")
	protected LocalDateTime createdAt;

	@LastModifiedDate
	@Field("updated_at")
	protected LocalDateTime updatedAt;

	@Field("is_deleted")
	protected char isDeleted = 'N';
}
