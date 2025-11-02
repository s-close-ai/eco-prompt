package com.closeai.ecoprompt.security.oauth;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.security.jwt.JwtUtil;
import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.user.repository.UserRepository;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;
    private final UserInfoRepository userInfoRepository;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth) {
        AppLogger.start("로그인 로직 시작");
        OAuth2User oAuth2User = (OAuth2User) auth.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name  = oAuth2User.getAttribute("name");
        Map<String,Object> profile = oAuth2User.getAttribute("profile");

        AppLogger.info("유저 정보 : " + profile.toString());

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

        UserInfo userInfo = userInfoRepository.findByUserId(user.getId())
                .orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."));

        Map<String,Object> responseBody = new HashMap<>();
        responseBody.put("sharingInformation", userInfo.getSharingInformation());
        responseBody.put("sharingInformationUpdatedAt", userInfo.getSharingInformationUpdatedAt());

        // JSON 형태로 반환
        res.setStatus(HttpServletResponse.SC_OK);
        res.setContentType("application/json; charset=UTF-8");

        ObjectMapper mapper = new ObjectMapper();
        try {
            res.getWriter().write(mapper.writeValueAsString(responseBody));
            res.getWriter().flush();
            AppLogger.complete("로그인 로직 완료");
        } catch (IOException e) {
            AppLogger.error(e.getMessage());
            throw new BusinessException("로그인 과정에 문제가 생겼습니다.");
        }
    }
}