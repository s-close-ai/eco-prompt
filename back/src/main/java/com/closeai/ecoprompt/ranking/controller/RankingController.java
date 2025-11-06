package com.closeai.ecoprompt.ranking.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.ranking.model.dto.response.RankingResponse;
import com.closeai.ecoprompt.ranking.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rankings")
public class RankingController {

    private final RankingService rankingService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<RankingResponse>>> getTodayRankings() {
        return ApiResponse.success(rankingService.getTodayTop10WithChange());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RankingResponse>>> getSpecificDateRankings(@RequestParam LocalDate date) {
        return ApiResponse.success(rankingService.getSnapshotByDate(date));
    }
}
