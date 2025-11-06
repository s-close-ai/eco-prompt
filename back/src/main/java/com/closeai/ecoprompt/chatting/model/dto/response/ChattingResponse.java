package com.closeai.ecoprompt.chatting.model.dto.response;

import com.closeai.ecoprompt.chatting.model.entity.Chatting;

public record ChattingResponse(
    int projectId,
    Long chattingId,
    String title
) {

    public static ChattingResponse from(Chatting chatting) {
        return new ChattingResponse(
                chatting.getProject().getId(),  // FK에서 projectId 추출
                chatting.getId(),
                chatting.getTitle()
        );
    }
}
