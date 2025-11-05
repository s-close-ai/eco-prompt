package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

import lombok.Getter;

@Getter
public class ModelErrorEvent extends ApplicationEvent {

	private final MessageDocument message;
	private final String messageUUID;

	public ModelErrorEvent(Object source, MessageDocument message, String messageUUID) {
		super(source);
		this.message = message;
		this.messageUUID = messageUUID;
	}
}
