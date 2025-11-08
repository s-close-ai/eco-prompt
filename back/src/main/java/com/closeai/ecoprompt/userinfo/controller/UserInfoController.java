package com.closeai.ecoprompt.userinfo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.userinfo.model.dto.request.UpdatePersonalPromptRequest;
import com.closeai.ecoprompt.userinfo.model.dto.response.GetUserInfoResponse;
import com.closeai.ecoprompt.userinfo.model.dto.response.SharingInformationStatusResponse;
import com.closeai.ecoprompt.userinfo.service.UserInfoService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/user-infos")
public class UserInfoController implements UserInfoControllerDocs {

	private final UserInfoService userInfoService;

	@GetMapping("/sharing-information")
	public ResponseEntity<ApiResponse<SharingInformationStatusResponse>> getSharingInformation() {

		return ApiResponse.success(userInfoService.getSharingInformationStatus());
	}

	@PatchMapping("/sharing-information")
	public ResponseEntity<ApiResponse<SharingInformationStatusResponse>> toggleSharingInformation() {

		return ApiResponse.success(userInfoService.toggleSharingInformation());
	}

	@PatchMapping("/personal-prompt")
	public ResponseEntity<ApiResponse<Void>> updatePersonalPrompt(
		@RequestBody @Valid UpdatePersonalPromptRequest request) {
		return ApiResponse.success(userInfoService.updatePersonalPrompt(request));
	}

	@GetMapping
	public ResponseEntity<ApiResponse<GetUserInfoResponse>> getUserInfo() {
		return ApiResponse.success(userInfoService.getUserPromptInfo());
	}

	@PatchMapping("/sharing-prompt")
	public ResponseEntity<ApiResponse<Void>> toggleSharingPrompt() {
		return ApiResponse.success(userInfoService.updateSharingPrompt());
	}

}
