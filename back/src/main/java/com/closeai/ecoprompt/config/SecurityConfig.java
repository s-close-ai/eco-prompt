package com.closeai.ecoprompt.config;

import com.closeai.ecoprompt.security.jwt.JwtAuthenticationFilter;
import com.closeai.ecoprompt.security.oauth.OAuth2SuccessHandler;
import com.closeai.ecoprompt.security.oauth.SsafyOAuth2UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
@EnableWebSecurity
public class SecurityConfig {

	private final SsafyOAuth2UserService ssafyOAuth2UserService;
	private final OAuth2SuccessHandler oAuth2SuccessHandler;
	private final JwtAuthenticationFilter jwtAuthenticationFilter;

	private static final String[] SWAGGER_URLS = {
		"/swagger-ui.html",	//메인 UI 페이지
		"/swagger-ui/**",
		"/v3/api-docs/**"
	};

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http
			.csrf(AbstractHttpConfigurer::disable)
			.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
			.authorizeHttpRequests(authorize -> authorize
				.requestMatchers(SWAGGER_URLS).permitAll()
				.requestMatchers("/", "/login", "/css/**", "/js/**").permitAll()
				.requestMatchers("/api/v1/auth/sign-in").permitAll()
				.anyRequest().authenticated()
			)
			.oauth2Login(oauth -> oauth
					.loginProcessingUrl("/api/v1/users/sign-in")  // ✅ redirect-uri endpoint
					.userInfoEndpoint(u -> u.userService(ssafyOAuth2UserService))
					.successHandler(oAuth2SuccessHandler)
			)
			.logout(logout -> logout.logoutSuccessUrl("/"));

		return http.build();
	}

}
