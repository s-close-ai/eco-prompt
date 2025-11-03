package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import lombok.Getter;

@Getter
public class LlmModelCompleteEvent extends ApplicationEvent {

	String messageUUID;
	String llmAnswer;

	public LlmModelCompleteEvent(Object source, String messageUUID, String llmAnswer) {
		super(source);
		this.messageUUID = messageUUID;
		this.llmAnswer = llmAnswer;
	}
}
