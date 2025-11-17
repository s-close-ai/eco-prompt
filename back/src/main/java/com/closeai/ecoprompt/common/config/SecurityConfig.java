package com.closeai.ecoprompt.common.config;

import com.closeai.ecoprompt.security.filter.JwtAuthenticationFilter;
import com.closeai.ecoprompt.security.filter.RefreshFilter;
import com.closeai.ecoprompt.security.logout.CookieLogoutHandler;
import com.closeai.ecoprompt.security.logout.SimpleLogoutSuccessHandler;
import com.closeai.ecoprompt.security.oauth.OAuth2SuccessHandler;
import com.closeai.ecoprompt.security.oauth.SsafyOAuth2UserService;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
@EnableMethodSecurity // @PreAuthorize 등 사용 시 권장 (SSE/비동기에서 특히 유효)
public class SecurityConfig {

    private final SsafyOAuth2UserService ssafyOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RefreshFilter refreshFilter;
    private final CookieLogoutHandler logoutHandler;
    private final SimpleLogoutSuccessHandler logoutSuccessHandler;

    private static final String[] SWAGGER_URLS = {
            "/swagger-ui.html",
            "/swagger-ui/**",
            "/v3/api-docs/**"
    };

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // 1) Stateless
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())

                // 2) 예외 처리: 이미 커밋됐으면 추가로 쓰지 않기
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) -> {
                            if (!res.isCommitted()) {
                                res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                                res.setContentType("application/json;charset=UTF-8");
                                res.getWriter().write("{\"error\":\"unauthorized\"}");
                            }
                        })
                        .accessDeniedHandler((req, res, e) -> {
                            if (!res.isCommitted()) {
                                res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                                res.setContentType("application/json;charset=UTF-8");
                                res.getWriter().write("{\"error\":\"forbidden\"}");
                            }
                        })
                )

                // 3) 인가: 공개 URL을 위에 먼저 배치
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                        // Preflight 전부 허용 (응답 선커밋 방지에 중요)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        .requestMatchers(SWAGGER_URLS).permitAll()
                        .requestMatchers("/", "/login", "/css/**", "/js/**").permitAll()

                        // 인증/토큰 관련 공개 엔드포인트
                        .requestMatchers("/api/v1/auth/sign-in").permitAll()
                        .requestMatchers("/api/v1/auth/refresh").permitAll()
                        .requestMatchers("/api/v1/auth/sign-out").permitAll()

                        // log lens 관련
                        .requestMatchers("/api/components/**", "/api/dependencies/**", "/api/logs/frontend").permitAll()

                        // 나머지는 인증 필요
                        .anyRequest().authenticated()
                )

                // 4) OAuth2 (필요 시 유지)
                .oauth2Login(oauth -> oauth
                        .loginProcessingUrl("/api/v1/users/sign-in")
                        .userInfoEndpoint(u -> u.userService(ssafyOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                )

                // 5) 로그아웃
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/sign-out")
                        .addLogoutHandler(logoutHandler)
                        .logoutSuccessHandler(logoutSuccessHandler)
                );

        // 6) 필터 순서: Refresh → JWT → UsernamePassword
        // refresh가 요청을 "단락 처리"할 수 있도록 JWT보다 먼저 배치
        http.addFilterBefore(refreshFilter, LogoutFilter.class);
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // 7) CORS 설정: 필요한 도메인으로 제한해서 사용 (여기선 예시로 전체 허용 형태)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();

        cfg.setAllowedOriginPatterns(List.of(
                "https://ecoprompt.duckdns.org",
                "http://ecoprompt.duckdns.org",
                "http://localhost:5173"
        ));
        cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setExposedHeaders(List.of("Authorization", "Set-Cookie"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }
}
