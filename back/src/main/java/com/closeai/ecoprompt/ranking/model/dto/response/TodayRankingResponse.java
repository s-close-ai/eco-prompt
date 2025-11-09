package com.closeai.ecoprompt.ranking.model.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

public record TodayRankingResponse(
        List<RankingResponse> content,
        String updatedAt
) {
    @JsonIgnore
    public boolean isEmpty() {
        return content == null || content.isEmpty();
    }
}
