package com.closeai.ecoprompt.message.model.dto.response;

public interface DailyRankingProjection {

    Integer getUserId();
    String  getName();        // user.name
    Double  getMaxScore();    // (4개 점수 합)의 "최고값"
    Integer getMileageSum();  // 마일리지 합
    Integer    getPromptCount(); // 프롬프트 수(사용자 메시지 수)

}