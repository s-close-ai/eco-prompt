package com.closeai.ecoprompt.mr.model.dto.response;

import lombok.Data;

@Data
public class AiMrAnalyzeResponse {
    private String newDescription;    // 완전히 새로 쓴 description
    private String additionalSection; // 혹은 기존 description에 붙일 섹션
}
