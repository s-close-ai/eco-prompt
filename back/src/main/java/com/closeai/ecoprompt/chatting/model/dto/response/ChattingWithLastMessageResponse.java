package com.closeai.ecoprompt.chatting.model.dto.response;

public record ChattingWithLastMessageResponse(
    int projectId,
    Long chattingId,
    String title,
    String lastMessage
) {
}
