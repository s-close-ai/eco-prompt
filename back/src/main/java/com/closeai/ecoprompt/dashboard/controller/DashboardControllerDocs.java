package com.closeai.ecoprompt.dashboard.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.DashboardDetailScoreResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.EcoPickResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.PersonalStateResponse;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;

import java.util.List;

public interface DashboardControllerDocs {

    @Operation(summary = "개인의 기록 통계를 조회하는 API",
            description = "개인의 전체 기간 최고 점수, 평균 점수, 전체 마일리지, 프롬프트 수를 조회합니다.")
    ResponseEntity<ApiResponse<PersonalStateResponse>> getRecord();

    @Operation(summary = "개인과 전체 사용자의 개별 점수 평균을 조회하는 API",
            description = "전체 기간의 개인과 전체 사용자의 4가지 개별에 대한 점수를 조회합니다.")
    ResponseEntity<ApiResponse<DashboardDetailScoreResponse>> getDetailScore();

    @Operation(summary = "에코픽을 조회하는 API",
            description = "하루 전의 00:00 ~ 23:59의 가장 점수가 높은 프롬프트 3개를 조회합니다. 이때, 한 사람의 프롬프트가 전부 등록될 수 있습니다.")
    ResponseEntity<ApiResponse<List<EcoPickResponse>>> getEcoPick();
}
