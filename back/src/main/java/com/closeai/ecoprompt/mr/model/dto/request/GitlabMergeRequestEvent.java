package com.closeai.ecoprompt.mr.model.dto.request;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@JsonIgnoreProperties(ignoreUnknown = true)
@Data
public class GitlabMergeRequestEvent {
    private String object_kind;
    private Project project;
    private ObjectAttributes object_attributes;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Project {
        private Long id;
        private String path_with_namespace;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ObjectAttributes {
        private Long id;
        private Integer iid;
        private String action;       // "open", "update" 등
        private String title;
        private String description;
        private String state;
    }
}
