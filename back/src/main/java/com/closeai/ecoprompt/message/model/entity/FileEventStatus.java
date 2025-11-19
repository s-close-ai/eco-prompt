package com.closeai.ecoprompt.message.model.entity;

public enum FileEventStatus {
	OCR_PENDING,    // TEXT 추출 작업 대기
	LLM_PENDING,    // LLM 작업 대기
	COMPLETED,        // 작업 완료
	ERROR        // 오류
}
