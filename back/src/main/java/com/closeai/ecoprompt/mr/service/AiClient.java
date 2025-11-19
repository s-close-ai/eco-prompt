package com.closeai.ecoprompt.mr.service;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.closeai.ecoprompt.ai.model.dto.request.LlmRequest;
import com.closeai.ecoprompt.ai.model.dto.response.LlmResponse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiClient {

	private final WebClient aiWebClient;

	public String analyzeMr(String title, String description, String diffText, String mrTemplate) {

		// 1) MR → Prompt 변환
		String prompt = MrPromptBuilder.buildMrPrompt(title, description, diffText, mrTemplate);
		log.info("prompt: {}", prompt);

		// 2) AI 서버가 요구하는 형태로 Request DTO 구성
		LlmRequest request = new LlmRequest("한글로 답해줘", prompt, UUID.randomUUID().toString());
		
        try {
            // 3) WebClient 호출
            String mrAnalyzePath = "/api/v1/ai/prompt-response";

            return aiWebClient.post()
                    .uri(mrAnalyzePath)
                    .accept(MediaType.TEXT_EVENT_STREAM)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToFlux(LlmResponse.class)
                    .takeUntil(res -> "DONE".equals(res.token()))
                    .filter(res ->
                            res.sequenceId() != null &&
                                    res.sequenceId() >= 0 &&
                                    !"START".equals(res.token()) &&
                                    !"DONE".equals(res.token())
                    )
					.map(res -> {
						Object tokenObj = res.token();
						if (tokenObj instanceof String) {
							return tokenObj.toString();
						} else if (tokenObj instanceof Map) {
							return "";
						}
						return tokenObj.toString();
					})
                    .collect(Collectors.joining())
                    .block();

        } catch (Exception e) {
            // 🔥 WebClient 예외 발생 → 기존 mrTemplate 반환
            log.error("[AI ERROR] MR 분석 중 오류 발생. 원본 템플릿을 반환합니다.", e);
            return mrTemplate;
        }
    }
}
