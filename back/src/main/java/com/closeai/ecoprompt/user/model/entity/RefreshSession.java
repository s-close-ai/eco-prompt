package com.closeai.ecoprompt.user.model.entity;

import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshSession {
    private String jti;
    private String userId;
    private String familyId;
    private String deviceId; // optional
    private String ipHash;   // optional
    private String uaHash;   // optional
    private long   exp;      // epoch ms (만료)
}
