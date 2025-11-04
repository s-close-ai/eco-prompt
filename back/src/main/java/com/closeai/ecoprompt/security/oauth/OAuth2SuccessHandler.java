package com.closeai.ecoprompt.security.oauth;

import com.closeai.ecoprompt.common.exception.BusinessException;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.security.cookie.TokenCookieManager;
import com.closeai.ecoprompt.security.jwt.dto.response.IssueResponse;
import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.user.repository.UserRepository;
import com.closeai.ecoprompt.user.service.TokenService;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
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

/**
 * OAuth2 로그인 성공 시:
 *  1) DB 유저 확인
 *  2) TokenService를 통해 Access/Refresh 발급(+RefreshSession Redis 저장)
 *  3) HttpOnly 쿠키로 내려주기 (Access/Refresh)
 *  4) 기존처럼 추가 정보(JSON) 응답
 */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final UserInfoRepository userInfoRepository;

    // 토큰 발급/회전/세션 저장(화이트리스트)을 캡슐화한 서비스
    private final TokenService tokenService;
    private final TokenCookieManager cookieManager;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest req, HttpServletResponse res, Authentication auth) {
        AppLogger.start("OAuth2 로그인 로직 시작");

        OAuth2User oAuth2User = (OAuth2User) auth.getPrincipal();

        String email = oAuth2User.getAttribute("email");
        String name  = oAuth2User.getAttribute("name");
        Map<String,Object> profile = oAuth2User.getAttribute("profile");
        AppLogger.info("OAuth2 프로필: " + (profile != null ? profile.toString() : "{}"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("해당하는 유저를 찾을 수 없습니다."));

        IssueResponse tokens = tokenService.issueOnLogin(
                String.valueOf(user.getId()), email, "USER", 1
        );

        cookieManager.writeAuthCookies(
                res,
                tokens.getAccessToken(),  tokenService.getAccessMaxAgeSec(),
                tokens.getRefreshToken(), tokenService.getRefreshMaxAgeSec()
        );

        UserInfo userInfo = userInfoRepository.findByUser_Id(user.getId())
                .orElseThrow(() -> new BusinessException("해당하는 유저가 없습니다."));

        Map<String,Object> responseBody = new HashMap<>();
        responseBody.put("name", name);
        responseBody.put("email", email);
        responseBody.put("sharingInformation", userInfo.getSharingInformation());
        responseBody.put("sharingInformationUpdatedAt", userInfo.getSharingInformationUpdatedAt());

        // JSON 응답
        res.setStatus(HttpServletResponse.SC_OK);
        res.setContentType("application/json; charset=UTF-8");
        try {
            new ObjectMapper().writeValue(res.getWriter(), responseBody);
            res.getWriter().flush();

            AppLogger.complete("OAuth2 로그인 로직 완료");
        } catch (IOException e) {
            AppLogger.error(e.getMessage());
            throw new BusinessException("로그인 과정에 문제가 생겼습니다.");
        }
    }

}