package com.closeai.ecoprompt.ranking.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.common.CustomUtil;
import com.closeai.ecoprompt.common.config.RedisCacheConfig;
import com.closeai.ecoprompt.common.service.CacheTimeService;
import com.closeai.ecoprompt.ranking.model.dto.response.RankingResponse;
import com.closeai.ecoprompt.ranking.service.RankingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.ZonedDateTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/rankings")
public class RankingController implements RankingControllerDocs {

    private final RankingService rankingService;
    private final CacheTimeService cacheTimeService;

    @GetMapping("/today")
    public ResponseEntity<ApiResponse<List<RankingResponse>>> getTodayRankings() {

        ZonedDateTime cachedAt = cacheTimeService.getCachedAt(
                RedisCacheConfig.TODAY_TOP10_CACHE, "today"
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Cache-Updated-At",
                cachedAt != null
                        ? CustomUtil.dateConverter(cachedAt.toLocalDateTime())
                        : ""
        );

        return ApiResponse.success(rankingService.getTodayTop10WithChange(), headers);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RankingResponse>>> getSpecificDateRankings(@RequestParam LocalDate date) {
        return ApiResponse.success(rankingService.getSnapshotByDate(date));
    }
}
