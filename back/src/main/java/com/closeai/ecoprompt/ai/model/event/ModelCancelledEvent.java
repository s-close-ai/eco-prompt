package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

import lombok.Getter;

@Getter
public class ModelCancelledEvent extends ApplicationEvent{

	private final MessageDocument message;
	private final String content;

	public ModelCancelledEvent(Object source, MessageDocument message, String content) {
		super(source);
		this.message = message;
		this.content = content;
	}
}
