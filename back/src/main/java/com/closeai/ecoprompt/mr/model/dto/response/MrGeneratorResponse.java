package com.closeai.ecoprompt.mr.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record MrGeneratorResponse(
        String webhookSecretToken,
        String gitlabApiAccessToken,
        String mrTemplate
) {

    public static MrGeneratorResponse from(UserInfo userInfo) {
        String webhookSecretToken = userInfo.getWebhookSecretToken();
        String gitlabApiAccessToken = userInfo.getGitlabApiAccessToken();

        return new MrGeneratorResponse(
                webhookSecretToken == null || webhookSecretToken.isEmpty() ? "" : webhookSecretToken,
                gitlabApiAccessToken == null || gitlabApiAccessToken.isEmpty() ? "" : "***" ,
                userInfo.getMrTemplate()
        );
    }
}
