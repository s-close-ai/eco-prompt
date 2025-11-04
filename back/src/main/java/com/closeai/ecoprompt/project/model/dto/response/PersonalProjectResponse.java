package com.closeai.ecoprompt.project.model.dto.response;

import com.closeai.ecoprompt.project.model.entity.Project;

public record PersonalProjectResponse(
        int projectId,
        String title
) {

    public static PersonalProjectResponse from(Project project) {
        return  new PersonalProjectResponse(
                project.getId(),
                project.getTitle()
        );
    }
}
