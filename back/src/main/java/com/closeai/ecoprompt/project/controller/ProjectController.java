package com.closeai.ecoprompt.project.controller;

import com.closeai.ecoprompt.common.ApiResponse;
import com.closeai.ecoprompt.project.model.dto.response.PersonalProjectResponse;
import com.closeai.ecoprompt.project.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/projects")
public class ProjectController {

    private final ProjectService projectService;

    @GetMapping("/users/{userId}")
    public ResponseEntity<ApiResponse<List<PersonalProjectResponse>>> getPersonalProjectResponse(@PathVariable int userId) {
        return ApiResponse.success(projectService.getPersonalProject(userId));
    }

}
