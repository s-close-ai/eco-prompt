package com.closeai.ecoprompt.mr.service;

import com.closeai.ecoprompt.mr.model.dto.response.GitlabMrChangesResponse;

import java.util.stream.Collectors;

public class DiffUtils {

    public static String buildUnifiedDiffText(GitlabMrChangesResponse mrChanges) {
        return mrChanges.getChanges().stream()
                .map(c -> {
                    String path = c.getNew_path() != null ? c.getNew_path() : c.getOld_path();
                    return "### File: " + path + "\n" + c.getDiff();
                })
                .collect(Collectors.joining("\n\n"));
    }
}
