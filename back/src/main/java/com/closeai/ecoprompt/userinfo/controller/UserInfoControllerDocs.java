package com.closeai.ecoprompt.userinfo.controller;

import org.springframework.http.ResponseEntity;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.userinfo.model.dto.request.UpdatePersonalPromptRequest;
import com.closeai.ecoprompt.userinfo.model.dto.response.GetUserInfoResponse;
import com.closeai.ecoprompt.userinfo.model.dto.response.SharingInformationStatusResponse;

import io.swagger.v3.oas.annotations.Operation;

public interface UserInfoControllerDocs {

	@Operation(summary = "데이터 학습 동의 정보 조회 API")
	ResponseEntity<ApiResponse<SharingInformationStatusResponse>> getSharingInformation();

	@Operation(summary = "데이터 학습 동의 정보 변경 API")
	ResponseEntity<ApiResponse<SharingInformationStatusResponse>> toggleSharingInformation();

	@Operation(summary = "사용자 지침 프롬프트 설정 API")
	ResponseEntity<ApiResponse<Void>> updatePersonalPrompt(UpdatePersonalPromptRequest request);

	@Operation(summary = "사용자 정보 조회 API(사용자 지침 + 프롬프트 공유 여부)")
	ResponseEntity<ApiResponse<GetUserInfoResponse>> getUserInfo();

	@Operation(summary = "프롬프트 공유 여부 변경 API")
	ResponseEntity<ApiResponse<Void>> toggleSharingPrompt();
}
