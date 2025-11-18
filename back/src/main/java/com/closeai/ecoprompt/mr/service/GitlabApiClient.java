package com.closeai.ecoprompt.mr.service;

import com.closeai.ecoprompt.mr.model.dto.response.GitlabMrChangesResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

@Service
@RequiredArgsConstructor
public class GitlabApiClient {

    private final WebClient gitlabWebClient;

    public GitlabMrChangesResponse getMrChanges(Long projectId, Integer mrIid) {
        return gitlabWebClient.get()
                .uri("/api/v4/projects/{projectId}/merge_requests/{iid}/changes",
                        projectId, mrIid)
                .retrieve()
                .bodyToMono(GitlabMrChangesResponse.class)
                .block();
    }

    public void updateMrDescription(Long projectId, Integer mrIid, String newDescription) {
        gitlabWebClient.put()
                .uri("/api/v4/projects/{projectId}/merge_requests/{iid}",
                        projectId, mrIid)
                .bodyValue(new org.springframework.util.LinkedMultiValueMap<String, String>() {{
                    add("description", newDescription);
                }})
                .retrieve()
                .toBodilessEntity()
                .block();
    }
}
