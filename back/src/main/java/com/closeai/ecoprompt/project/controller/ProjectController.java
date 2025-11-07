package com.closeai.ecoprompt.project.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.chatting.service.ChattingService;
import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.project.model.dto.request.PersonalProjectRequest;
import com.closeai.ecoprompt.project.model.dto.request.ProjectUpdateRequest;
import com.closeai.ecoprompt.project.model.dto.response.CreateProjectResponse;
import com.closeai.ecoprompt.project.model.dto.response.SidebarResponse;
import com.closeai.ecoprompt.project.model.dto.response.SpecificProjectResponse;
import com.closeai.ecoprompt.project.service.ProjectService;

import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/projects")
public class ProjectController implements ProjectControllerDocs {

	private final ProjectService projectService;
	private final ChattingService chattingService;

	@GetMapping
	public ResponseEntity<ApiResponse<SidebarResponse>> getPersonalProject() {
		return ApiResponse.success(new SidebarResponse(projectService.getPersonalProject()));
	}

	@PostMapping
	public ResponseEntity<ApiResponse<CreateProjectResponse>> saveProject(
		@RequestBody PersonalProjectRequest projectRequest
	) {
		return ApiResponse.success(projectService.saveProject(projectRequest));
	}

	@GetMapping("/{projectId}")
	public ResponseEntity<ApiResponse<SpecificProjectResponse>> getProject(@PathVariable int projectId) {
		return ApiResponse.success(projectService.getSpecificProject(projectId));
	}

	@PatchMapping("/{projectId}")
	public ResponseEntity<ApiResponse<Void>> updateProject(@PathVariable int projectId,
		@RequestBody ProjectUpdateRequest projectRequest) {
		return ApiResponse.success(projectService.updateProjectTitle(projectId, projectRequest));
	}

	@PatchMapping("/delete")
	public ResponseEntity<ApiResponse<Void>> deleteProject(@RequestParam int projectId) {
		return ApiResponse.noContent(projectService.deleteProject(projectId));
	}

	@GetMapping("/{projectId}/chattings")
	public ResponseEntity<ApiResponse<Page<ChattingResponse>>> getChattingsWithPaging(
		@PathVariable Integer projectId,
		@RequestParam(required = false, defaultValue = "0") Integer page
	) {
		return ApiResponse.success(chattingService.getChattings(projectId, page));
	}

}
