package com.closeai.ecoprompt.training.model.dto;

import com.closeai.ecoprompt.message.model.entity.MessageSender;

public record TrainingItem(
        String messageUUID,
        MessageSender sender_type, // 필드명을 API 스펙대로 보존
        String content
) {
}
