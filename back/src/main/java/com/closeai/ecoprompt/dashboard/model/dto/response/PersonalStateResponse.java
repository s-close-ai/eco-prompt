package com.closeai.ecoprompt.dashboard.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record PersonalStateResponse(
        Double highScore,
        Double averageScore,
        int totalMileage,
        int promptCount
) {
    public static PersonalStateResponse from(UserInfo userInfo) {
        return new PersonalStateResponse(
                userInfo.getHighScore(),
                userInfo.getTotalScore() / userInfo.getPromptCount(),
                userInfo.getTotalMileage(),
                userInfo.getPromptCount()
        );
    }
}
