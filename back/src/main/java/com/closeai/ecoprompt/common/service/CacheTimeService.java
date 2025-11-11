package com.closeai.ecoprompt.common.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class CacheTimeService {

    private final StringRedisTemplate stringRedisTemplate;

    // 캐시 설정과 반드시 일치시켜야 함: ranking:today는 5분
    private static final Duration TODAY_TTL = Duration.ofMinutes(5);

    /**
     * key 형식: cacheName::key  (Spring Cache 기본 규칙)
     * 여기서는 "ranking:today::today"
     */
    public @Nullable ZonedDateTime getCachedAt(String cacheName, String key) {
        String redisKey = cacheName + "::" + key;

        // 남은 TTL(ms)
        Long remainMs = stringRedisTemplate.getExpire(redisKey, TimeUnit.MILLISECONDS);
        if (remainMs == null || remainMs < 0) {
            // -1: TTL 없음(무기한), -2: 키 없음 → 생성시각 계산 불가
            return null;
        }

        long ageMs = TODAY_TTL.toMillis() - remainMs;
        if (ageMs < 0) ageMs = 0; // 경계 값 보정
        return ZonedDateTime.now(ZoneId.of("Asia/Seoul")).minus(Duration.ofMillis(ageMs));
    }
}
