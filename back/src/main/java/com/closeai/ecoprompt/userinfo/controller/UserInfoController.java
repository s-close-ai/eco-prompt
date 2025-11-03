package com.closeai.ecoprompt.userinfo.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.userinfo.model.dto.response.SharingInformationStatusResponse;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user-infos")
public class UserInfoController {

    private final UserInfoService userInfoService;

    @GetMapping("/{userId}/sharing-information")
    public ResponseEntity<ApiResponse<SharingInformationStatusResponse>> getSharingInformation(
            @PathVariable Integer userId
    ) {

        return ApiResponse.success(userInfoService.getSharingInformationStatus(userId));
    }

    @PatchMapping("/{userId}/sharing-information")
    public ResponseEntity<ApiResponse<SharingInformationStatusResponse>> toggleSharingInformation(
            @PathVariable Integer userId
    ) {

        return ApiResponse.success(userInfoService.toggleSharingInformation(userId));
    }

}
