package com.closeai.ecoprompt.security.filter;

import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.user.service.TokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * POST /api/v1/auth/refresh 로 들어오는 요청을 컨트롤러 없이 처리
 */
@Component
@RequiredArgsConstructor
public class RefreshFilter extends OncePerRequestFilter {
    private final TokenService tokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        AppLogger.start("REFRESH TOKEN을 통한 재발급 필터 진입");

        String uri = req.getRequestURI();
        if (uri.startsWith("/api/v1/gitlab/webhook")) {
            chain.doFilter(req, res);
            return;
        }

        if (HttpMethod.POST.matches(req.getMethod())
                && "/api/v1/auth/refresh".equals(req.getRequestURI())) {
            // roles/email/tokenVersion 이 JWT 내부에 있으면 null 전달 가능
            tokenService.handleRefresh(req, res, null, null, 1);
            return; // 체인 종료 (여기서 응답 완료)
        }
        chain.doFilter(req, res);
    }
}
