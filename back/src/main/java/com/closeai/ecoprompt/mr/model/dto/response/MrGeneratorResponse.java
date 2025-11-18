package com.closeai.ecoprompt.mr.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record MrGeneratorResponse(
        String webhookSecretToken,
        String gitlabApiAccessToken,
        String mrTemplate
) {

    public static MrGeneratorResponse from(UserInfo userInfo) {
        return new MrGeneratorResponse(
                userInfo.getWebhookSecretToken(),
                userInfo.getGitlabApiAccessToken(),
                userInfo.getMrTemplate()
        );
    }
}
