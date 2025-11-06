package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import lombok.Getter;

@Getter
public class JudgeModelCompleteEvent extends ApplicationEvent {

	private final String messageUUID; // 점수를 저장할 대상 메시지 UUID
	private final Integer userId;
	private final String summary;
	private final ScoreInfo scoreInfo;

	public JudgeModelCompleteEvent(Object source, String messageUUID, Integer userId, String summary, ScoreInfo scoreInfo) {
		super(source);
		this.messageUUID = messageUUID;
		this.userId = userId;
		this.summary = summary;
		this.scoreInfo = scoreInfo;
	}

}
