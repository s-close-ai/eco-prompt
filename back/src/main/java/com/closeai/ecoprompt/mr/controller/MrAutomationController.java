package com.closeai.ecoprompt.mr.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.mr.model.dto.response.MrGeneratorResponse;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/merge-requests")
@RequiredArgsConstructor
public class MrAutomationController {

    private final UserInfoService userInfoService;

    @GetMapping
    public ResponseEntity<ApiResponse<MrGeneratorResponse>> getMrAutoGeneratorConfig() {
        return ApiResponse.success(userInfoService.getGeneratorResponse());
    }
}
