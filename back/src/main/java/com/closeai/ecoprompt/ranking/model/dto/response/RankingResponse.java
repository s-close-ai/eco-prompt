package com.closeai.ecoprompt.ranking.model.dto.response;

import com.closeai.ecoprompt.ranking.model.entity.RankingChange;

public record RankingResponse(
    int ranking,
    String name,
    Double score,
    int mileage,
    int promptCount,
    RankingChange change
) {
}
