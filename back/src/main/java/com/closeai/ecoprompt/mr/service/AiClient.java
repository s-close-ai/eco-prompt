package com.closeai.ecoprompt.mr.service;

import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper; // 스프링에 이미 빈으로 있음

    public String analyzeMr(String title, String description, String diffText, String mrTemplate) {

        String prompt = MrPromptBuilder.buildMrPrompt(title, description, diffText, mrTemplate);
        log.info("prompt: {}", prompt);

        LlmRequest request = new LlmRequest("한글로 답해줘", prompt, UUID.randomUUID().toString());

        try {
            String mrAnalyzePath = "/api/v1/ai/prompt-response";

            // 1) SSE 토큰 전부 합치기
            String raw = aiWebClient.post()
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
                        return tokenObj != null ? tokenObj.toString() : "";
                    })
                    .collect(Collectors.joining())
                    .block();

            log.info("raw: {}", raw);

            // 2) tool_call 텍스트에서 JSON만 잘라내기
            String content = extractContentFromToolCall(raw);
            if (content == null || content.isBlank()) {
                log.warn("[AI] content 추출 실패, 원본 템플릿 반환");
                return mrTemplate;
            }

            return content;

        } catch (Exception e) {
            log.error("[AI ERROR] MR 분석 중 오류 발생. 원본 템플릿을 반환합니다.", e);
            return mrTemplate;
        }
    }

    /**
     * 예:
     * <tool_call>{"name":"save_as_pdf","arguments":{"title":"...","content":"..."}}</tool_call>
     * 에서 arguments.content 만 꺼내기
     */
    private String extractContentFromToolCall(String raw) {
        if (raw == null) return null;

        try {
            // <tool_call> 태그 안의 JSON 부분만 잘라내기
            int jsonStart = raw.indexOf('{');
            int jsonEnd = raw.lastIndexOf('}');
            if (jsonStart < 0 || jsonEnd <= jsonStart) {
                log.warn("[AI] JSON 구간을 찾지 못했습니다. raw={}", raw);
                return null;
            }

            String jsonPart = raw.substring(jsonStart, jsonEnd + 1);

            // {"name": "...", "arguments": {...}} 구조를 Map으로 파싱
            Map<String, Object> root = objectMapper.readValue(
                    jsonPart, new TypeReference<Map<String, Object>>() {
                    }
            );

            Object argsObj = root.get("arguments");
            if (!(argsObj instanceof Map)) {
                log.warn("[AI] arguments 필드를 찾지 못했습니다. jsonPart={}", jsonPart);
                return null;
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> args = (Map<String, Object>) argsObj;

            Object content = args.get("content");
            if (content == null) {
                log.warn("[AI] arguments.content 가 없습니다. args={}", args);
                return null;
            }

            return content.toString();

        } catch (Exception e) {
            log.error("[AI] tool_call content 파싱 실패. raw={}", raw, e);
            return null;
        }
    }
}
