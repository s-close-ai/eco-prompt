package com.closeai.ecoprompt.message.model.entity;

public enum MessageStatus {

	RECEIVED, 	// USER 메시지 수신 완료
	PROCESSING, // AI 메시지 응답 생성 대기
	STREAMING, // AI 메시지 응답 전송중
	COMPLETED, // AI 메시지 응답 완료
	CANCELLED, // AI 메시지 응답 중지
	ERROR	// 공통 메시지 응답 오류
	
}