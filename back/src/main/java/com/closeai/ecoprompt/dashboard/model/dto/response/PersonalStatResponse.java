package com.closeai.ecoprompt.dashboard.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record PersonalStatResponse(
        Double highScore,
        Double averageScore,
        int totalMileage,
        int promptCount
) {
    public static PersonalStatResponse from(UserInfo userInfo) {
        return new PersonalStatResponse(
                userInfo.getHighScore(),
                userInfo.getHighScore() / userInfo.getPromptCount(),
                userInfo.getTotalMileage(),
                userInfo.getPromptCount()
        );
    }
}
