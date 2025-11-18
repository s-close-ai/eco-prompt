package com.closeai.ecoprompt.security.filter;

import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.security.cookie.TokenCookieManager;
import com.closeai.ecoprompt.security.jwt.JwtUtil;
import com.closeai.ecoprompt.user.service.TokenService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final TokenService tokenService;         // ★ 추가
    private final TokenCookieManager cookieManager;  // ★ 추가

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws IOException, ServletException {
        AppLogger.start("API 호출 전 토큰 유효성 검사");

        // 1) 스킵 경로
        String uri = req.getRequestURI();
        if (uri.startsWith("/api/v1/auth/sign-in")
                || uri.startsWith("/api/v1/auth/refresh")
                || uri.startsWith("/api/v1/auth/sign-out")
                || uri.startsWith("/oauth2/")
                || uri.startsWith("/swagger-ui/")
                || uri.startsWith("/v3/api-docs")
                || uri.startsWith("/api/v1/gitlab/webhook")
        ) {
            chain.doFilter(req, res);
            return;
        }

        String access = readCookie(req, TokenCookieManager.ACCESS_COOKIE);

        AppLogger.info("ACCESS TOKEN 검증");
        try {
            if (StringUtils.hasText(access)) {
                // 2) 비즈니스 검증 (전역 컷오프 등)
                tokenService.validateAccessOrThrow(access);
                setAuth(jwtUtil.parseClaimsStrict(access), req);
                chain.doFilter(req, res);
                return;
            }
        } catch (io.jsonwebtoken.ExpiredJwtException | SecurityException ex) {
            // access 만료/무효 → 아래에서 refresh 회전 시도
        }

        // 3) access 없거나 만료 → refresh 자동 회전 시도
        AppLogger.info("ACCESS TOKEN이 INVALID 한 상황에서 REFRESH TOKEN 검증 및 토큰 재발급");
        String refresh = readCookie(req, TokenCookieManager.REFRESH_COOKIE);
        refresh = stripBearer(refresh); // Postman에서 ‘Bearer ’ 붙이는 실수 흡수
        if (StringUtils.hasText(refresh)) {
            try {
                var rotated = tokenService.rotate(refresh, null, null, 1);
                cookieManager.writeAuthCookies(res,
                        rotated.getAccessToken(), tokenService.getAccessMaxAgeSec(),
                        rotated.getRefreshToken(), tokenService.getRefreshMaxAgeSec());
                setAuth(jwtUtil.parseClaimsStrict(rotated.getAccessToken()), req);
                chain.doFilter(req, res);
                return;
            } catch (Exception e) {
                cookieManager.clearAuthCookies(res);
                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

        // 4) 둘 다 없음 → 익명 통과 (이후 authorize에서 401)
        AppLogger.info("모든 토큰이 INVALID 한 상황에서 401 반환");
        chain.doFilter(req, res);
    }

    private String readCookie(HttpServletRequest req, String name) {
        var cookies = req.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie c : cookies) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }

        return null;
    }

    private String stripBearer(String v) {
        if (v == null) {
            return null;
        }

        v = v.trim();
        return v.startsWith("Bearer ") ? v.substring(7).trim() : v;
        // ※ 쿠키에는 원래 Bearer를 붙이지 않지만, 실수 방지용
    }

    private void setAuth(Claims claims, HttpServletRequest req) {
        String userId = claims.getSubject();
        String roleCsv = claims.get("roles", String.class);

        var auths = (roleCsv == null ? List.<GrantedAuthority>of()
                : Arrays.stream(roleCsv.split(",")).map(String::trim).filter(s -> !s.isEmpty())
                .map(r -> new SimpleGrantedAuthority("ROLE_" + r)).toList());

        var auth = new UsernamePasswordAuthenticationToken(userId, null, auths);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(req));

        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
