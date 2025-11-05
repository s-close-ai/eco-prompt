package com.closeai.ecoprompt.dashboard.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.DashboardDetailScoreResponse;
import com.closeai.ecoprompt.dashboard.model.dto.response.PersonalStatResponse;
import com.closeai.ecoprompt.dashboard.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/dashboards")
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/records")
    public ResponseEntity<ApiResponse<PersonalStatResponse>> getRecord() {
        return ApiResponse.success(dashboardService.getRecord());
    }

    @GetMapping("/detail-scores")
    public ResponseEntity<ApiResponse<DashboardDetailScoreResponse>> getDetailScore() {
        return ApiResponse.success(dashboardService.getDetailScore());
    }
}
