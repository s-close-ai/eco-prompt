package com.closeai.ecoprompt.dashboard.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record PersonalStateResponse(
        Double highScore,
        Double averageScore,
        int totalMileage,
        Long promptCount
) {
    public static PersonalStateResponse from(UserInfo userInfo) {
        Long validPromptCount = userInfo.getTotalPromptCount() - userInfo.getTotalFailCount();

        return new PersonalStateResponse(
                userInfo.getHighScore(),
                validPromptCount != 0
                        ? Math.round(userInfo.getTotalScore() / validPromptCount * 100) / 100.0
                        : 0,
                userInfo.getTotalMileage(),
                userInfo.getTotalPromptCount()
        );
    }
}
