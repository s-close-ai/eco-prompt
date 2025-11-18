package com.closeai.ecoprompt.mr.controller;

import com.closeai.ecoprompt.mr.model.dto.request.GitlabMergeRequestEvent;
import com.closeai.ecoprompt.mr.service.MergeRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/gitlab")
public class GitlabWebhookController {

    private final MergeRequestService mergeRequestService;

    @Value("${gitlab.webhook-secret}")
    private String webhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader(value = "X-Gitlab-Token", required = false) String token,
            @RequestBody GitlabMergeRequestEvent event
    ) {
        // 1) 토큰 검증
        if (token == null || !token.equals(webhookSecret)) {
            log.warn("Invalid webhook token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid token");
        }

        // 2) MR 이벤트인지 확인
        if (!"merge_request".equals(event.getObject_kind())) {
            return ResponseEntity.ok("Ignored: not MR");
        }

        String action = event.getObject_attributes().getAction();
        if (!("open".equals(action))) {
            return ResponseEntity.ok("Ignored: action=" + action);
        }

        try {
            mergeRequestService.processMergeRequestEvent(event);
        } catch (Exception e) {
            log.error("Error processing MR event", e);
            // Webhook은 일단 200 주는 게 깔끔 (GitLab에서 재시도 줄이려면)
        }

        return ResponseEntity.ok("OK");
    }
}
