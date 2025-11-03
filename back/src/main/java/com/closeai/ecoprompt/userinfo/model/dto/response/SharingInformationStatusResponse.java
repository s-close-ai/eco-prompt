package com.closeai.ecoprompt.userinfo.model.dto.response;

import com.closeai.ecoprompt.userinfo.model.entity.UserInfo;

public record SharingInformationStatusResponse(
        String sharingInformation,
        String sharingInformationUpdatedAt
) {
    public static SharingInformationStatusResponse from(UserInfo userInfo) {

        return new SharingInformationStatusResponse(
                userInfo.getSharingInformation(),
                userInfo.getSharingInformationUpdatedAt()
        );
    }
}
