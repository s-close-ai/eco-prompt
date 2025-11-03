package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.ai.model.dto.response.InputJudgeResponse;
import com.closeai.ecoprompt.message.model.entity.ScoreInfo;

import lombok.Getter;

@Getter
public class JudgeModelCompleteEvent extends ApplicationEvent {

	private final String messageUUID; // 점수를 저장할 대상 메시지 UUID
	private final String summary;
	private final ScoreInfo scoreInfo;

	public JudgeModelCompleteEvent(Object source, String messageUUID, String summary, ScoreInfo scoreInfo) {
		super(source);
		this.messageUUID = messageUUID;
		this.summary = summary;
		this.scoreInfo = scoreInfo;
	}

}
