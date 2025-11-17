package com.closeai.ecoprompt.user.repository.redis;

import a306.dependency_logger_starter.logging.annotation.NoLogging;
import com.closeai.ecoprompt.user.model.entity.RefreshSession;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Component
@RequiredArgsConstructor
@NoLogging
public class RefreshSessionRepository {

    private final StringRedisTemplate srt;
    private final ObjectMapper om;

    private String key(String jti) {
        return "rt:" + jti;
    }

    private String userSessionsKey(String userId) {
        return "user:" + userId + ":sessions";
    }

    // ★ family 단위 세션 인덱스 (userId + familyId → jti Set)
    private String familySessionsKey(String userId, String familyId) {
        return "user:" + userId + ":fam:" + familyId + ":sessions";
    }

    private String logoutAfterKey(String userId) {
        return "user:" + userId + ":logoutAfter";
    }

    public void save(RefreshSession session, Duration ttl) {
        try {
            String json = om.writeValueAsString(session);
            srt.opsForValue().set(key(session.getJti()), json, ttl);
            srt.opsForSet().add(userSessionsKey(session.getUserId()), session.getJti());

            if (session.getFamilyId() != null) {
                srt.opsForSet().add(familySessionsKey(session.getUserId(), session.getFamilyId()), session.getJti());
            }
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    public Optional<RefreshSession> find(String jti) {
        String json = srt.opsForValue().get(key(jti));
        if (json == null) return Optional.empty();
        try {
            return Optional.of(om.readValue(json, RefreshSession.class));
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    public void delete(String userId, String jti) {
        srt.delete(key(jti));
        srt.opsForSet().remove(userSessionsKey(userId), jti);
    }

    // ★ 권장: familyId까지 아는 경우에 깔끔히 정리
    public void delete(String userId, String familyId, String jti) {
        srt.delete(key(jti));
        srt.opsForSet().remove(userSessionsKey(userId), jti);
        if (familyId != null) {
            srt.opsForSet().remove(familySessionsKey(userId, familyId), jti);
        }
    }

    public Set<String> findAllJtis(String userId) {
        Set<String> members = srt.opsForSet().members(userSessionsKey(userId));
        return members != null ? members : Set.of();
    }

    // ★ familyId 기준으로 JTI 목록 조회
    public Set<String> findAllJtisByFamilyId(String userId, String familyId) {
        Set<String> members = srt.opsForSet().members(familySessionsKey(userId, familyId));
        return members != null ? members : Set.of();
    }

    public void setLogoutAfter(String userId, long epochMs) {
        srt.opsForValue().set(logoutAfterKey(userId), Long.toString(epochMs));
    }

    public long getLogoutAfter(String userId) {
        String v = srt.opsForValue().get(logoutAfterKey(userId));
        return (v == null) ? 0L : Long.parseLong(v);
    }

    public void deleteAllSessions(String userId) {
        Set<String> all = findAllJtis(userId);
        if (!all.isEmpty()) {
            List<String> keys = all.stream().map(j -> "rt:" + j).toList();
            srt.delete(keys);
        }
        srt.delete(userSessionsKey(userId));
    }

    // ★ family 단위 전량 삭제 (재사용 감지 시 호출)
    public void deleteAllSessionsByFamilyId(String userId, String familyId) {
        String famKey = familySessionsKey(userId, familyId);
        Set<String> jtis = srt.opsForSet().members(famKey);
        if (jtis != null && !jtis.isEmpty()) {
            // rt:<jti> 키들 삭제
            List<String> rtKeys = jtis.stream().map(this::key).toList();
            srt.delete(rtKeys);
            // 사용자 전체 인덱스에서 해당 jti들 제거
            srt.opsForSet().remove(userSessionsKey(userId), jtis.toArray());
        }
        // family 인덱스 자체 삭제
        srt.delete(famKey);
    }
}
