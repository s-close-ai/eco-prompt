package com.closeai.ecoprompt.project.model.dto.response;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingWithLastMessageResponse;
import com.closeai.ecoprompt.project.model.entity.Project;

import java.util.List;

public record SpecificProjectResponse(
        int projectId,
        String title,
        List<ChattingWithLastMessageResponse> chattingResponses
) {

    public static SpecificProjectResponse of(Project project, List<ChattingWithLastMessageResponse> chattingResponses) {
        return  new SpecificProjectResponse(
                project.getId(),
                project.getTitle(),
                chattingResponses
        );
    }
}
