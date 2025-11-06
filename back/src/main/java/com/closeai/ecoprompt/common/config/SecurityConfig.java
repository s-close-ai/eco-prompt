package com.closeai.ecoprompt.common.config;

import com.closeai.ecoprompt.security.filter.JwtAuthenticationFilter;
import com.closeai.ecoprompt.security.filter.RefreshFilter;
import com.closeai.ecoprompt.security.logout.CookieLogoutHandler;
import com.closeai.ecoprompt.security.logout.SimpleLogoutSuccessHandler;
import com.closeai.ecoprompt.security.oauth.OAuth2SuccessHandler;
import com.closeai.ecoprompt.security.oauth.SsafyOAuth2UserService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutFilter;

@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
public class SecurityConfig {

	private final SsafyOAuth2UserService ssafyOAuth2UserService;
	private final OAuth2SuccessHandler oAuth2SuccessHandler;
	private final JwtAuthenticationFilter jwtAuthenticationFilter;
	private final RefreshFilter refreshFilter;
	private final CookieLogoutHandler logoutHandler;
	private final SimpleLogoutSuccessHandler logoutSuccessHandler;

	private static final String[] SWAGGER_URLS = {
		"/swagger-ui.html",	//메인 UI 페이지
		"/swagger-ui/**",
		"/v3/api-docs/**"
	};

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			// 세션 stateless로 만들기
			.sessionManagement(sm ->
					sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
			)
			.csrf(AbstractHttpConfigurer::disable)
			.addFilterBefore(refreshFilter, LogoutFilter.class)
			.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
			.authorizeHttpRequests(authorize -> authorize
				.requestMatchers(SWAGGER_URLS).permitAll()
				.requestMatchers("/", "/login", "/css/**", "/js/**").permitAll()
				.requestMatchers("/api/v1/auth/sign-in").permitAll()
				.requestMatchers("/api/v1/auth/refresh").permitAll()   // ✅ 추가
				.requestMatchers("/api/v1/auth/sign-out").permitAll()  // (이미 logoutUrl로 처리하더라도 명시적 허용 추천)
				.anyRequest().authenticated()
			)
			.oauth2Login(oauth -> oauth
					.loginProcessingUrl("/api/v1/users/sign-in")  // ✅ redirect-uri endpoint
					.userInfoEndpoint(u -> u.userService(ssafyOAuth2UserService))
					.successHandler(oAuth2SuccessHandler)
			)
			// 로그아웃 URL을 Spring Security가 직접 처리
			.logout(logout -> logout
					.logoutUrl("/api/v1/auth/sign-out")
					.addLogoutHandler(logoutHandler)
					.logoutSuccessHandler(logoutSuccessHandler)
			)
			.exceptionHandling(ex -> ex
					.authenticationEntryPoint(
							(req, res, e)
									-> res.setStatus(HttpServletResponse.SC_UNAUTHORIZED)
					)
			);

		return http.build();
	}

}
