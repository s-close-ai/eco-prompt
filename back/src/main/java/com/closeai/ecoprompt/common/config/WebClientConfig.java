package com.closeai.ecoprompt.common.config;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

	@Bean
	public WebClient.Builder webClientBuilder() {
		return WebClient.builder()
			.defaultHeader(HttpHeaders.ACCEPT, "application/json")
			.defaultHeader(HttpHeaders.CONTENT_TYPE, "application/json");
	}

	/**
	 * 사용자 입력 JudgeModel WebClient Bean
	 * */
	@Bean
	@Qualifier("judgePrompt")
	public WebClient webClientInputJudge(
		WebClient.Builder builder,
		@Value("${ai.model.url.judge-prompt}") String baseUrl
	) {
		return builder.baseUrl(baseUrl).build();
	}

	/**
	 * 사용자 입력 답변 Model WebClient Bean
	 * */
	@Bean
	@Qualifier("llm")
	public WebClient webClientLlm(
		WebClient.Builder builder,
		@Value("${ai.model.url.llm}") String baseUrl
	){
		return builder.baseUrl(baseUrl).build();
	}

	/**
	 * 학습 JudgeModel WebClient Bean
	 * */
	@Bean
	@Qualifier("judgeLlm")
	public WebClient webClientTrainingJudge(
		WebClient.Builder builder,
		@Value("${ai.model.url.judge-llm}") String baseUrl
	){
		return builder.baseUrl(baseUrl).build();
	}

}
