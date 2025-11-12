package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.message.model.entity.MessageSender;

import lombok.Getter;

@Getter
public class EachModelEvent extends ApplicationEvent {

	private final String messageUUID;
	private final MessageSender sender;

	public EachModelEvent(Object source, String messageUUID, MessageSender sender) {
		super(source);
		this.messageUUID = messageUUID;
		this.sender = sender;
	}
}
