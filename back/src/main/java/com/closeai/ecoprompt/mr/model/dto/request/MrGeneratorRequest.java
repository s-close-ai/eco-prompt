package com.closeai.ecoprompt.mr.model.dto.request;

public record MrGeneratorRequest (
        String webhookSecretToken,
        String gitlabApiAccessToken,
        String mrTemplate
) {
}
