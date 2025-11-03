package com.closeai.ecoprompt.common.entity;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Field;

public abstract class MongoBaseEntity {

	@CreatedDate
	@Field("created_at")
	protected String createdAt;

	@LastModifiedDate
	@Field("updated_at")
	protected String updatedAt;

	@Field("is_deleted")
	protected char isDeleted;
}
