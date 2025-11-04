package com.closeai.ecoprompt.project.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.project.model.dto.request.PersonalProjectRequest;
import com.closeai.ecoprompt.project.model.dto.response.SidebarResponse;
import com.closeai.ecoprompt.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping
    public ResponseEntity<ApiResponse<SidebarResponse>> getPersonalProject(@RequestParam int userId) {
        return ApiResponse.success(new SidebarResponse(projectService.getPersonalProject(userId)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SidebarResponse>> saveProject(
            @RequestBody PersonalProjectRequest projectRequest
    ) {
        return ApiResponse.success(new SidebarResponse(projectService.saveProject(projectRequest)));
    }

    @PatchMapping("/{projectId}")
    public ResponseEntity<ApiResponse<Void>> updateProject(@PathVariable int projectId, @RequestBody PersonalProjectRequest projectRequest) {
        return ApiResponse.success(projectService.updateProjectTitle(projectId, projectRequest));
    }

}
