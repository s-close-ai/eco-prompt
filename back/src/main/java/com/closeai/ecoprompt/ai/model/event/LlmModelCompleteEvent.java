package com.closeai.ecoprompt.ai.model.event;

import org.springframework.context.ApplicationEvent;

import com.closeai.ecoprompt.ai.model.dto.response.LLMFileResponse;

import lombok.Getter;

@Getter
public class LlmModelCompleteEvent extends ApplicationEvent {

	String messageUUID;
	String llmAnswer;
	String trainingAnswer;
	LLMFileResponse llmFileResponse;

	public LlmModelCompleteEvent(Object source, String messageUUID, String llmAnswer, String trainingAnswer,
		LLMFileResponse llmFileResponse) {
		super(source);
		this.messageUUID = messageUUID;
		this.llmAnswer = llmAnswer;
		this.trainingAnswer = trainingAnswer;
		this.llmFileResponse = llmFileResponse;
	}
}
