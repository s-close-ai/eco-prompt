package com.closeai.ecoprompt.message.model.dto.response;

public interface EcoPickFlatProjection {
    String getName();
    Double getSumOfScore();
    String getMessageUUID();
    Double getClarityScore();
    Double getSpecificityScore();
    Double getFormatScore();
    Double getSafetyScore();
}