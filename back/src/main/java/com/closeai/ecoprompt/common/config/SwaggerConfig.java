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

    private static final String ACCESS_SCHEME = "accessAuth";
    private static final String REFRESH_SCHEME = "refreshAuth";

    @Bean
    public OpenAPI openAPI() {
        // 1️⃣ Info 설정
        Info info = new Info()
                .title("EcoPrompt API Documentation")
                .version("1.0")
                .description("EcoPrompt API 명세서입니다.");

        // 2️⃣ Security Scheme 설정 (JWT 입력 필드 생성)
        SecurityScheme accessScheme = new SecurityScheme()
                .name(ACCESS_SCHEME)
                .type(SecurityScheme.Type.HTTP)          // HTTP 방식
                .scheme("bearer")                        // Bearer 토큰
                .bearerFormat("JWT")                     // JWT 명시
                .description("Access Token을 입력하세요. 예: `Bearer {token}`");

        // 3️⃣ Refresh Token용 Security Scheme
        SecurityScheme refreshScheme = new SecurityScheme()
                .name(REFRESH_SCHEME)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("Refresh Token을 입력하세요. 예: `Bearer {refreshToken}`");

        // 4️⃣ 전역 Security Requirement (두 토큰 필드 모두 Swagger UI에 표시)
        SecurityRequirement securityRequirement = new SecurityRequirement()
                .addList(ACCESS_SCHEME)
                .addList(REFRESH_SCHEME);

        // 5️⃣ 최종 OpenAPI 구성 반환
        return new OpenAPI()
                .info(info)
                .addSecurityItem(securityRequirement)
                .components(new Components()
                        .addSecuritySchemes(ACCESS_SCHEME, accessScheme)
                        .addSecuritySchemes(REFRESH_SCHEME, refreshScheme));
    }
}