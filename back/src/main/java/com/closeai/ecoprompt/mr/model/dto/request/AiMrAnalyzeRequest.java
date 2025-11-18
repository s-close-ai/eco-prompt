package com.closeai.ecoprompt.mr.model.dto.request;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiMrAnalyzeRequest {
    private String mrTitle;
    private String mrDescription;
    private String diffText;
}

