package com.closeai.ecoprompt.dashboard.model.dto.response;

public record EcoPickResponse(
        String name,
        Double sumOfScore,
        String prompt,
        DetailScoreResponse detailScore
) {
}
