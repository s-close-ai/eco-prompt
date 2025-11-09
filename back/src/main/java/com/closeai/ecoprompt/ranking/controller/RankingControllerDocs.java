package com.closeai.ecoprompt.ranking.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.ranking.model.dto.response.RankingResponse;
import com.closeai.ecoprompt.ranking.model.dto.response.TodayRankingResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;

public interface RankingControllerDocs {

    @Operation(summary = "어제와 비교한 오늘의 랭킹을 조회하는 API",
            description = "랭킹, 이름, 점수, 마일리지, 프롬프트 수, 랭킹 변동에 대한 정보를 API 호출 시마다 조회합니다.")
    ResponseEntity<ApiResponse<TodayRankingResponse>> getTodayRankings();

    @Operation(summary = "특정 날짜의 랭킹을 조회하는 API",
            description = "랭킹, 이름, 점수, 마일리지, 프롬프트 수, 랭킹 변동에 대한 정보를 SNAPSHOT으로 저장하고 DB에서 조회합니다.")
    ResponseEntity<ApiResponse<List<RankingResponse>>> getSpecificDateRankings(
            @Parameter(
                    description = "조회할 날짜 (예: 2025-11-08 형식). 해당 날짜의 00시~23:59까지 집계된 랭킹 스냅샷을 반환합니다.",
                    example = "2025-11-08"
            )
            LocalDate date
    );

}
