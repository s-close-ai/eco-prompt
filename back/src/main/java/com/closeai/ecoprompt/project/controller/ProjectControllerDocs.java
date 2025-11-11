package com.closeai.ecoprompt.project.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.project.model.dto.request.PersonalProjectRequest;
import com.closeai.ecoprompt.project.model.dto.request.ProjectUpdateRequest;
import com.closeai.ecoprompt.project.model.dto.response.CreateProjectResponse;
import com.closeai.ecoprompt.project.model.dto.response.SidebarResponse;
import com.closeai.ecoprompt.project.model.dto.response.SpecificProjectResponse;

import io.swagger.v3.oas.annotations.Operation;

public interface ProjectControllerDocs {

	@Operation(summary = "사이드바의 프로젝트 및 채팅 목록 조회 API")
	ResponseEntity<ApiResponse<SidebarResponse>> getPersonalProject();

	@Operation(summary = "프로젝트 생성 API")
	ResponseEntity<ApiResponse<CreateProjectResponse>> saveProject(PersonalProjectRequest projectRequest);

	@Operation(summary = "특정 프로젝트 내부 채팅방 목록 조회 API(채팅방 이름 + 마지막 채팅 내역)")
	ResponseEntity<ApiResponse<SpecificProjectResponse>> getProject(int projectId);

	@Operation(summary = "프로젝트 이름 수정 API")
	ResponseEntity<ApiResponse<Void>> updateProject(int projectId, ProjectUpdateRequest projectUpdateRequest);

	@Operation(summary = "프로젝트 삭제 API")
	ResponseEntity<ApiResponse<Void>> deleteProject(int projectId);

	@Operation(summary = "프로젝트 내부의 채팅방 목록 조회 API(채팅방 이름 + 페이지네이션)")
	ResponseEntity<ApiResponse<Page<ChattingResponse>>> getChattingsWithPaging(Integer projectId, Integer page);

}
