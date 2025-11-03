package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.ai.model.dto.response.InputJudgeResponse;

import lombok.Getter;

@Getter
public class JudgeModelCompleteEvent extends ApplicationEvent {

	private final String messageUUID; // 점수를 저장할 대상 메시지 UUID
	private final InputJudgeResponse judgeResponse;

	public JudgeModelCompleteEvent(Object source, String messageUUID, InputJudgeResponse judgeResponse) {
		super(source);
		this.messageUUID = messageUUID;
		this.judgeResponse = judgeResponse;
	}

}
