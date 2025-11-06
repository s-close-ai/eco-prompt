package com.closeai.ecoprompt.dashboard.model.dto.response;

public record DetailScoreResponse(
        Double clarityScore,
        Double specificityScore,
        Double formatScore,
        Double safetyScore
) {
}
