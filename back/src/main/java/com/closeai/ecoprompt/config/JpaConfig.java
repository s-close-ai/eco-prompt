package com.closeai.ecoprompt.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(
	basePackages = "com.closeai.ecoprompt.**.repository", // 일단 넓게 스캔하되
	excludeFilters = @ComponentScan.Filter( // 제외 필터 적용
		type = FilterType.REGEX, // 정규식으로
		pattern = ".*\\.mongo\\..*" // 패키지 경로에 .mongo. 가 들어간 것은 모두 제외
	)
)
public class JpaConfig {
}
