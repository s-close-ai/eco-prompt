package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

import lombok.Getter;

@Getter
public class ModelErrorEvent extends ApplicationEvent {

	private final String messageUUID;
	private final MessageDocument message;

	public ModelErrorEvent(Object source, String messageUUID, MessageDocument message) {
		super(source);
		this.messageUUID = messageUUID;
		this.message = message;
	}
}
