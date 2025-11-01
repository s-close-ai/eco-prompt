package com.closeai.ecoprompt.security.oauth;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.security.jwt.JwtUtil;
import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.user.repository.UserRepository;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.util.Map;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    public OAuth2SuccessHandler(JwtUtil jwtUtil, UserRepository userRepository) {
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth) {
        OAuth2User oAuth2User = (OAuth2User) auth.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name  = oAuth2User.getAttribute("name");
        Map<String,Object> profile = oAuth2User.getAttribute("profile");

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("해당하는 유저를 찾을 수 없습니다."));

        String token = jwtUtil.generateToken(
                email,
                name,
                user.getId(),
                (String)profile.get("edu"),
                (String)profile.get("clss")
        );

        Cookie cookie = new Cookie("ACCESS_TOKEN", token);
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(60 * 60 * 1); // 1시간
        res.addCookie(cookie);

        // TODO: Redirect URL 변경 필요
        try {
            // ✅ 로그인 성공 후 프론트엔드로 리다이렉트
            res.sendRedirect("/index.html");
        } catch (Exception ignored) {}
    }
}