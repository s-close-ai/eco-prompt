package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.ai.model.dto.response.LLMFileResponse;
import com.closeai.ecoprompt.message.model.entity.MessageSender;

import lombok.Getter;

@Getter
public class ModelCancelledEvent extends ApplicationEvent {

	private final String messageUUID;
	private final String content;
	private final MessageSender messageSender;
	private final Integer userId;
	private final LLMFileResponse llmFileResponse;

	public ModelCancelledEvent(Object source, String messageUUID, String content, MessageSender messageSender,
		Integer userId, LLMFileResponse llmFileResponse) {
		super(source);
		this.messageUUID = messageUUID;
		this.content = content;
		this.messageSender = messageSender;
		this.userId = userId;
		this.llmFileResponse = llmFileResponse;
	}
}
