package com.closeai.ecoprompt.dashboard.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record PersonalStateResponse(
        Double highScore,
        Double averageScore,
        int totalMileage,
        Long promptCount
) {
    public static PersonalStateResponse from(UserInfo userInfo) {
        return new PersonalStateResponse(
                userInfo.getHighScore(),
                userInfo.getTotalPromptCount() != 0 ? userInfo.getTotalScore() / userInfo.getTotalPromptCount() : 0,
                userInfo.getTotalMileage(),
                userInfo.getTotalPromptCount()
        );
    }
}
