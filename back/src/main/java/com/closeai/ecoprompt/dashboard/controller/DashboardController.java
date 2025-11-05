package com.closeai.ecoprompt.dashboard.controller;

import com.closeai.ecoprompt.common.ApiResponse;
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

    @GetMapping("/personal")
    public ResponseEntity<ApiResponse<PersonalStatResponse>> getPersonalStatistics() {
        return ApiResponse.success(dashboardService.getPersonalStatistics());
    }
}
