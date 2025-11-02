package com.closeai.ecoprompt.common.config;

import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;

@Configuration
public class SwaggerConfig {

	private static final String SECURITY_SCHEME_NAME = "bearerAuth";

	@Bean
	public OpenAPI openAPI() {
		// 1️⃣ Info 설정
		Info info = new Info()
				.title("EcoPrompt API Documentation")
				.version("1.0")
				.description("EcoPrompt API 명세서입니다.");

		// 2️⃣ Security Scheme 설정 (JWT 입력 필드 생성)
		SecurityScheme securityScheme = new SecurityScheme()
				.name(SECURITY_SCHEME_NAME)
				.type(SecurityScheme.Type.HTTP)          // HTTP 방식
				.scheme("bearer")                        // Bearer 토큰
				.bearerFormat("JWT")                     // JWT 명시
				.description("Access Token을 입력하세요. 예: `Bearer {token}`");

		// 3️⃣ Security Requirement (전역 적용)
		SecurityRequirement securityRequirement = new SecurityRequirement()
				.addList(SECURITY_SCHEME_NAME);

		// 4️⃣ OpenAPI 구성 반환
		return new OpenAPI()
				.info(info)
				.addSecurityItem(securityRequirement)    // 인증 요구사항 추가
				.components(new Components().addSecuritySchemes(SECURITY_SCHEME_NAME, securityScheme));
	}
}