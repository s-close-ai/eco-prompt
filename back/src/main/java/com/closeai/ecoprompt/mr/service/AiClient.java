package com.closeai.ecoprompt.mr.service;

import com.closeai.ecoprompt.ai.model.dto.request.LlmRequest;
import com.closeai.ecoprompt.ai.model.dto.response.LlmResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiClient {

    private final WebClient aiWebClient;

//    @Value("${ai.mr-analyze-path}")
    private String mrAnalyzePath = "/api/v1/ai/prompt-response";

    public String analyzeMr(String title, String description, String diffText) {

        // 1) MR → Prompt 변환
        String prompt = MrPromptBuilder.buildMrPrompt(title, description, diffText);
        log.info("prompt: {}", prompt);

        // 2) AI 서버가 요구하는 형태로 Request DTO 구성
        LlmRequest request = new LlmRequest("한글로 답해줘", prompt, UUID.randomUUID().toString());

        // 2) SSE 스트림을 최종 문자열로 합쳐서 반환
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
                .map(LlmResponse::token)
                .collect(Collectors.joining())
                .block();
    }
}
