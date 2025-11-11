package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import lombok.Getter;

@Getter
public class LlmModelCompleteEvent extends ApplicationEvent {

	String messageUUID;
	String llmAnswer;
	String trainingAnswer;

	public LlmModelCompleteEvent(Object source, String messageUUID, String llmAnswer, String trainingAnswer) {
		super(source);
		this.messageUUID = messageUUID;
		this.llmAnswer = llmAnswer;
		this.trainingAnswer = trainingAnswer;
	}
}
