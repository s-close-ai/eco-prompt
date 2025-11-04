package com.closeai.ecoprompt.project.model.dto.response;

import java.util.List;

public record SidebarResponse(
        List<PersonalProjectResponse> personalProjectResponses
) {
}
