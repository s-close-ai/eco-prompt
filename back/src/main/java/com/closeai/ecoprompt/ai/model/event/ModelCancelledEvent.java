package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;

import lombok.Getter;

@Getter
public class ModelCancelledEvent extends ApplicationEvent{

	private final MessageDocument messageDocument;
	private final String content;

	public ModelCancelledEvent(Object source, MessageDocument messageDocument, String content) {
		super(source);
		this.messageDocument = messageDocument;
		this.content = content;
	}
}
