package com.closeai.ecoprompt.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

	private static final String[] SWAGGER_URLS = {
		"/swagger-ui.html",	//메인 UI 페이지
		"/swagger-ui/**",
		"/v3/api-docs/**"
	};

	@Bean
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		http.authorizeHttpRequests(authorize -> authorize
			.requestMatchers(SWAGGER_URLS).permitAll()
			.anyRequest().authenticated());

		return http.build();
	}

}
