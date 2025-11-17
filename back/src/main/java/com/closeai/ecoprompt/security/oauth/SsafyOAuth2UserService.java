package com.closeai.ecoprompt.security.oauth;

import a306.dependency_logger_starter.logging.annotation.NoLogging;
import com.closeai.ecoprompt.bookmark.model.entity.Bookmark;
import com.closeai.ecoprompt.bookmark.repository.BookmarkRepository;
import com.closeai.ecoprompt.project.model.entity.Project;
import com.closeai.ecoprompt.project.repository.ProjectRepository;
import com.closeai.ecoprompt.user.model.entity.User;
import com.closeai.ecoprompt.user.repository.UserRepository;
import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;
import com.closeai.ecoprompt.userinfo.repository.UserInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserService;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.*;

@Service
@RequiredArgsConstructor
@NoLogging
public class SsafyOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {

    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final UserInfoRepository userInfoRepository;

    // ── HTTP 클라이언트
    private final RestTemplate restTemplate = new RestTemplate();
    private final BookmarkRepository bookmarkRepository;

    // ── Open API 설정
    @Value("${app.ssafy.openapi.base-url}")
    private String openApiBaseUrl;

    @Value("${app.ssafy.openapi.api-key}")
    private String openApiKey;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest req) throws OAuth2AuthenticationException {
        ClientRegistration reg = req.getClientRegistration();
        String accessToken = req.getAccessToken().getTokenValue();

        // 1) 인증용 userInfo 호출 (Bearer 토큰)
        Map<String, Object> loginAttrs = fetchLoginUserInfo(
                reg.getProviderDetails().getUserInfoEndpoint().getUri(), accessToken);

        // loginAttrs 예: { "userId": "...", "email": "...", "name": "...", "edu": "13기" }
        String email = asString(loginAttrs.get("email"));
        String name = asString(loginAttrs.get("name"));
        String userId = firstNonBlank(loginAttrs, "userId", "id", "uid"); // 문서에 “고유 식별 번호”라고 표기

        if (email == null || name == null) {
            throw new OAuth2AuthenticationException(new OAuth2Error("missing_info"),
                    "필수 정보(email/name)가 없습니다.");
        }

        // 2) (옵션) 오픈 API 사용자 프로필 호출 (apiKey 쿼리 파라미터) — userId가 있어야 호출
        Map<String, Object> openApiProfile = Collections.emptyMap();
        if (userId != null && !userId.isBlank()) {
            openApiProfile = fetchOpenApiUserProfile(userId); // 실패해도 로그인은 계속 진행
        }

        String edu = (String) openApiProfile.get("edu");
        // 3) DB upsert (당신의 User 엔티티: employeeNumber/email/name/projectId)
        String employeeNumber = edu != null ? edu : "UNKNOWN";  // edu를 임시 사번으로 사용
        User user = userRepository.findByEmail(email)
                .orElseGet(() -> {
                            User u = userRepository.save(
                                    User.builder()
                                            .email(email)
                                            .employeeNumber(employeeNumber)
                                            .name(name)
                                            .projectId(0)
                                            .build()
                            );

                            userInfoRepository.save(
                                    UserInfo.makeDefaultUserInfo(u)
                            );

                            Project p = projectRepository.save(
                                    Project.builder()
                                            .title("기본 프로젝트")
                                            .owner(u)
                                            .build()
                            );

                            setupBookMarkAtSignUp(u);

                            u.setProjectId(p.getId());
                            return u;
                        }
                );

        // 4) Security Principal (FE로 내려갈 attributes에 두 응답을 합쳐 넣으면 디버그/표시에 좋음)
        Map<String, Object> merged = new LinkedHashMap<>();
        merged.putAll(loginAttrs);
        if (openApiProfile != null && !openApiProfile.isEmpty()) {
            merged.put("profile", openApiProfile);
        }

        return new DefaultOAuth2User(
                Set.of(new SimpleGrantedAuthority("ROLE_USER")),
                merged,
                "email"
        );
    }

    // ───────────────────────── helpers ─────────────────────────

    private Map<String, Object> fetchLoginUserInfo(String userInfoUri, String accessToken) {
        if (userInfoUri == null || userInfoUri.isBlank()) {
            throw new OAuth2AuthenticationException(new OAuth2Error("invalid_configuration"),
                    "user-info-uri가 비어 있습니다.");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        RequestEntity<Void> http = RequestEntity.get(URI.create(userInfoUri))
                .headers(headers).build();

        ResponseEntity<Map> resp = restTemplate.exchange(http, Map.class);
        if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
            throw new OAuth2AuthenticationException(new OAuth2Error("userinfo_error"),
                    "SSAFY userInfo 요청 실패: " + resp.getStatusCode());
        }
        return resp.getBody();
    }

    private Map<String, Object> fetchOpenApiUserProfile(String userId) {
        try {
            URI uri = UriComponentsBuilder
                    .fromHttpUrl(openApiBaseUrl)
                    .path("/users/{userId}")
                    .queryParam("apiKey", openApiKey)
                    .buildAndExpand(userId)
                    .toUri();

            // 오픈 API는 API Key로만 인증하므로 Authorization 헤더 불필요
            ResponseEntity<Map> resp = restTemplate.exchange(
                    RequestEntity.get(uri).build(), Map.class);

            if (resp.getStatusCode().is2xxSuccessful() && resp.getBody() != null) {
                return resp.getBody();
            }
        } catch (Exception e) {
            // open-api 실패는 로그인 자체를 막지 않음: 로깅만
            System.err.println("[SSAFY-OPENAPI] profile fetch failed: " + e.getMessage());
        }
        return Collections.emptyMap();
    }

    private static String asString(Object o) {
        return o == null ? null : String.valueOf(o);
    }

    private static String firstNonBlank(Map<String, Object> m, String... keys) {
        for (String k : keys) {
            Object v = m.get(k);
            if (v != null && !String.valueOf(v).isBlank()) return String.valueOf(v);
        }
        return null;
    }

    private void setupBookMarkAtSignUp(User u) {
        List<Bookmark> bookmarks = List.of(
                Bookmark.builder()
                        .url("https://edu.ssafy.com/edu/main/index.do")
                        .title("에듀 싸피")
                        .owner(u)
                        .sequence(1)
                        .description("싸피 출결 관리")
                        .build(),

                Bookmark.builder()
                        .url("https://ssafy-attendance.vercel.app/?tab=confirm")
                        .title("싸피 출결 소명기")
                        .owner(u)
                        .sequence(2)
                        .description("싸피 출결 소명기 웹")
                        .build()
        );

        bookmarkRepository.saveAll(bookmarks);
    }
}