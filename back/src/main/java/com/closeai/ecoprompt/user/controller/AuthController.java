package com.closeai.ecoprompt.user.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;


@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @GetMapping("/sign-in")
    public ResponseEntity<Void> signIn(HttpServletResponse response) throws IOException {
        // SSAFY OAuth2 로그인 시작 URL로 리다이렉트
        String redirectUrl = "/oauth2/authorization/ssafy";

        // 302 리다이렉트 응답 반환
        response.sendRedirect(redirectUrl);
        return ResponseEntity.status(HttpStatus.FOUND).build();
    }
}