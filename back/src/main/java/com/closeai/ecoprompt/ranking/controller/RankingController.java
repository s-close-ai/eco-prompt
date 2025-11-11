package com.closeai.ecoprompt.ranking.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.ranking.model.dto.response.RankingResponse;
import com.closeai.ecoprompt.ranking.model.dto.response.TodayRankingResponse;
import com.closeai.ecoprompt.ranking.service.RankingService;
import com.closeai.ecoprompt.ranking.service.RankingSnapshotJob;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rankings")
public class RankingController implements RankingControllerDocs {

    private final RankingService rankingService;
    private final RankingSnapshotJob rankingSnapshotJob;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<TodayRankingResponse>> getTodayRankings() {
        return ApiResponse.success(rankingService.getTodayTop10WithChange());
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RankingResponse>>> getSpecificDateRankings(@RequestParam LocalDate date) {
        return ApiResponse.success(rankingService.getSnapshotByDate(date));
    }

    @PostMapping("/snapshot")
    public ResponseEntity<ApiResponse<Void>> passiveTrigger() {
        return ApiResponse.success(rankingSnapshotJob.snapshotYesterday());
    }
}
