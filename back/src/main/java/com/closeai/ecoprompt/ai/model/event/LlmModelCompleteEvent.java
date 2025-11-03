package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageStatus;

import lombok.Getter;

@Getter
public class LlmModelCompleteEvent extends ApplicationEvent {

	String messageUUID;
	String llmAnswer;
	MessageStatus status;

	public LlmModelCompleteEvent(Object source, String messageUUID, String llmAnswer, MessageStatus status) {
		super(source);
		this.messageUUID = messageUUID;
		this.llmAnswer = llmAnswer;
		this.status = status;
	}
}
