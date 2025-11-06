package com.closeai.ecoprompt.project.model.dto.response;

import com.closeai.ecoprompt.chatting.model.dto.response.ChattingResponse;
import com.closeai.ecoprompt.project.model.entity.Project;
import org.springframework.data.domain.Page;

public record PersonalProjectResponse(
        int projectId,
        String title,
        Page<ChattingResponse> chattingResponses
) {

    public static PersonalProjectResponse of(Project project, Page<ChattingResponse> chattingResponses) {
        return  new PersonalProjectResponse(
                project.getId(),
                project.getTitle(),
                chattingResponses
        );
    }
}
