package com.closeai.ecoprompt.project.model.dto.response;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.project.model.entity.Project;

import java.util.List;

public record PersonalProjectResponse(
        int projectId,
        String title,
        List<ChattingResponse> chattingResponses
) {

    public static PersonalProjectResponse of(Project project, List<ChattingResponse> chattingResponses) {
        return  new PersonalProjectResponse(
                project.getId(),
                project.getTitle(),
                chattingResponses
        );
    }
}
