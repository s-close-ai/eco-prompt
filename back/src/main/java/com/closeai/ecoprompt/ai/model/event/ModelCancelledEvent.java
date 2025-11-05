package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageDocument;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

import lombok.Getter;

@Getter
public class ModelCancelledEvent extends ApplicationEvent{

	private final String messageUUID;
	private final String content;
	private final MessageSender messageSender;

	public ModelCancelledEvent(Object source, String messageUUID, String content,  MessageSender messageSender) {
		super(source);
		this.messageUUID = messageUUID;
		this.content = content;
		this.messageSender = messageSender;
	}
}
