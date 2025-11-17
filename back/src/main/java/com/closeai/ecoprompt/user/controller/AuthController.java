package com.closeai.ecoprompt.user.controller;

import a306.dependency_logger_starter.logging.annotation.NoLogging;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
@NoLogging
public class AuthController implements AuthControllerDocs {

    @GetMapping("/sign-in")
    public ResponseEntity<Void> signIn(HttpServletResponse response) throws Exception {
        response.sendRedirect("/oauth2/authorization/ssafy");
        return ResponseEntity.status(HttpStatus.FOUND).build();
    }

}