package com.closeai.ecoprompt.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;

public interface AuthControllerDocs {

    @Operation(summary = "사용자 로그인 API",
            description = "싸피 OAuth2 로그인하는 API")
    ResponseEntity<Void> signIn(HttpServletResponse response) throws Exception;

}
