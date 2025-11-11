package com.closeai.ecoprompt.training.model.dto.request;

import com.closeai.ecoprompt.training.model.dto.TrainingItem;

import java.util.List;

public record TrainingRequest(
        List<TrainingItem> items
) {
}