package com.closeai.ecoprompt.project.model.dto.request;

import jakarta.validation.constraints.Size;

public record ProjectUpdateRequest(
    @Size(max = 100, message = "프로젝트 제목은 최대 100자까지 입력할 수 있습니다.")
    String title
) {
}
