package com.closeai.ecoprompt.chatting.model.dto.response;

public record ChattingResponse(
    int projectId,
    Long chattingId,
    String title
) {
}
