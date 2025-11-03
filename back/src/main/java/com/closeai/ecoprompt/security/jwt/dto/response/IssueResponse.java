package com.closeai.ecoprompt.security.jwt.dto.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class IssueResponse {

    private String accessToken;
    private String refreshToken;
}