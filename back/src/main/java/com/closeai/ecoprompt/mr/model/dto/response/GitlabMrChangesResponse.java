package com.closeai.ecoprompt.mr.model.dto.response;

import lombok.Data;

import java.util.List;

@Data
public class GitlabMrChangesResponse {
    private Long id;
    private Integer iid;
    private List<Change> changes;

    @Data
    public static class Change {
        private String old_path;
        private String new_path;
        private String diff; // 실제 diff 내용
    }
}