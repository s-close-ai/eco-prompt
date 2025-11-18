package com.closeai.ecoprompt.mr.service;

import com.closeai.ecoprompt.mr.model.dto.request.GitlabMergeRequestEvent;
import com.closeai.ecoprompt.mr.model.dto.response.AiMrAnalyzeResponse;
import com.closeai.ecoprompt.mr.model.dto.response.GitlabMrChangesResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MergeRequestService {

    private final GitlabApiClient gitlabApiClient;
    private final AiClient aiClient;

    private static final String MARKER_START = "<!-- auto-ai-start -->";
    private static final String MARKER_END = "<!-- auto-ai-end -->";

    public void processMergeRequestEvent(GitlabMergeRequestEvent event, String gitlabApiToken) {
        Long projectId = event.getProject().getId();
        Integer mrIid = event.getObject_attributes().getIid();
        String title = event.getObject_attributes().getTitle();
        String originalDescription = event.getObject_attributes().getDescription();

        log.info("Processing MR event: project={}, iid={}", projectId, mrIid);

        // 1) MR diff/changes 조회
        GitlabMrChangesResponse mrChanges =
                gitlabApiClient.getMrChanges(projectId, mrIid, gitlabApiToken);

        // 2) diff 문자열로 합치기
        String diffText = DiffUtils.buildUnifiedDiffText(mrChanges);
        log.info("Diff text: {}", diffText);

        // 3) AI 모델 호출 (MR 설명 + diff 기반 분석/요약/리뷰)
        String aiOutput = aiClient.analyzeMr(title, originalDescription, diffText);

        AiMrAnalyzeResponse aiResponse = new AiMrAnalyzeResponse();
        aiResponse.setAdditionalSection(aiOutput);

        // 4) 새 description 구성 로직
        String newDescription = buildNewDescription(originalDescription, aiResponse);

        // 5) GitLab MR 업데이트
        gitlabApiClient.updateMrDescription(projectId, mrIid, newDescription, gitlabApiToken);

        log.info("MR description updated: project={}, iid={}", projectId, mrIid);
    }

    private String buildNewDescription(String original, AiMrAnalyzeResponse aiResponse) {
        if (original == null) original = "";

        // (1) AI가 완전히 새 description을 주는 경우
        if (aiResponse.getNewDescription() != null && !aiResponse.getNewDescription().isBlank()) {
            return aiResponse.getNewDescription();
        }

        // (2) 기존 description에 추가 섹션을 덧붙이는 경우 (마커 기반)
        String autoBlock = MARKER_START + "\n"
                + (aiResponse.getAdditionalSection() != null ? aiResponse.getAdditionalSection() : "")
                + "\n" + MARKER_END;

        if (original.contains(MARKER_START)) {
            // 기존 자동 블록 교체
            return original.replaceAll(
                    MARKER_START + "[\\s\\S]*?" + MARKER_END,
                    autoBlock
            );
        } else {
            // 맨 아래에 붙이기
            if (!original.isBlank()) {
                return original + "\n\n" + autoBlock;
            } else {
                return autoBlock;
            }
        }
    }
}
