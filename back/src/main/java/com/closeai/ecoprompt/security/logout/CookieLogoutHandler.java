package com.closeai.ecoprompt.security.logout;

import com.closeai.ecoprompt.user.service.TokenService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.logout.LogoutHandler;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CookieLogoutHandler implements LogoutHandler {

    private final TokenService tokenService;

    @Override
    public void logout(HttpServletRequest req, HttpServletResponse res, Authentication authentication) {
        tokenService.handleLogoutCurrent(req, res);
        // 상태코드는 LogoutSuccessHandler에서 결정
    }
}