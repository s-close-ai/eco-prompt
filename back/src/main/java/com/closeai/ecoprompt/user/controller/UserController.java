package com.closeai.ecoprompt.user.controller;

import com.closeai.ecoprompt.security.jwt.JwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UserController {

    private final JwtUtil jwtUtil;

    @GetMapping("/me")
    public Object me(HttpServletRequest req) {
        String token = null;
        if (req.getCookies() != null) {
            for (Cookie c : req.getCookies()) {
                if ("ACCESS_TOKEN".equals(c.getName())) token = c.getValue();
            }
        }

        if (token == null) return Map.of("authenticated", false);

        Claims claims = jwtUtil.validateAndParse(token);
        if (claims == null) return Map.of("authenticated", false);

        return Map.of(
                "authenticated", true,
                "email", claims.getSubject(),
                "name", claims.get("name")
        );
    }
}