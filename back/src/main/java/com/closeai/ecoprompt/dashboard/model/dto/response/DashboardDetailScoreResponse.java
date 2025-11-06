package com.closeai.ecoprompt.dashboard.model.dto.response;

public record DashboardDetailScoreResponse(
    DetailScoreResponse myScoreResponse,
    DetailScoreResponse allScoreResponse
) {
}
