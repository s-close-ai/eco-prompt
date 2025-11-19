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

        String prompt = MrPromptBuilder.buildMrPrompt(title, description, diffText, mrTemplate);
        log.info("prompt: {}", prompt);

        LlmRequest request = new LlmRequest("한글로 답해줘", prompt, UUID.randomUUID().toString());

        try {
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

                        // 툴콜 응답인 경우: {"name": "...", "arguments": { "title": "...", "content": "..." }}
                        if (tokenObj instanceof Map<?, ?> map) {
                            Object argsObj = map.get("arguments");
                            if (argsObj instanceof Map<?, ?> args) {
                                Object content = args.get("content");
                                if (content != null) {
                                    return content.toString();
                                }
                            }
                            return "";
                        }

                        // 문자열 토큰은(“네 알겠습니다~” 같은) MR 템플릿에는 필요 없으니 무시
                        return "";
                    })
                    .collect(Collectors.joining())
                    .block();

        } catch (Exception e) {
            log.error("[AI ERROR] MR 분석 중 오류 발생. 원본 템플릿을 반환합니다.", e);
            return mrTemplate;
        }
    }
}
