package com.closeai.ecoprompt.security.jwt;

import com.closeai.ecoprompt.common.logging.AppLogger;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String SECRET;
    private Key key;

    private static final long ACCESS_EXP_MS = 1000L * 60 * 10; // 짧게(권장: 5~15분), 현재 10분
    private static final long REFRESH_EXP_MS = 1000L * 60 * 60 * 24 * 1; // 길게(권장: 15~30일), 현재 1일

    @PostConstruct
    public void init() {
        this.key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
    }

    // ============== 발급 ==============

    /**
     * 액세스 토큰 발급
     */
    public String issueAccess(String userId, String email, String roles, Integer tokenVersion) {
        AppLogger.start("엑세스 토큰 발급");

        String jti = UUID.randomUUID().toString();
        AppLogger.info("엑세스 토큰의 JTI", jti);

        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(jti)                           // jti
                .subject(userId)                   // sub: userId를 subject로 추천
                .claim("email", email)
                .claim("roles", roles)             // "USER,ADMIN" 등.. 근데 권한이 필요할까?
                .claim("tokenVersion", tokenVersion)
                .claim("token_use", "access")      // 구분용
                .issuedAt(new Date(now))
                .expiration(new Date(now + ACCESS_EXP_MS))
                .signWith(key)
                .compact();
    }

    /**
     * 리프레시 토큰 발급 (회전/재사용 탐지용 familyId 포함)
     */
    public String issueRefresh(String userId, String familyId) {
        AppLogger.start("리프레시 토큰 발급");

        String jti = UUID.randomUUID().toString();
        AppLogger.info("리프레시 토큰의 JTI", jti);

        long now = System.currentTimeMillis();
        return Jwts.builder()
                .id(jti)                           // jti = Redis 키 rt:<jti>
                .subject(userId)                   // sub
                .claim("familyId", familyId)
                .claim("token_use", "refresh")
                .issuedAt(new Date(now))
                .expiration(new Date(now + REFRESH_EXP_MS))
                .signWith(key)
                .compact();
    }

    // ============== 공통 파싱 ==============

    /**
     * 서명/만료 포함 검증 + Claims 반환 (유효하지 않으면 예외 던짐)
     */
    public Claims parseClaimsStrict(String token) {
        return Jwts.parser()
                .verifyWith((SecretKey) key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    // ============== 헬퍼 ==============

    public boolean isAccess(Claims c) {
        return "access".equals(c.get("token_use", String.class));
    }

    public boolean isRefresh(Claims c) {
        return "refresh".equals(c.get("token_use", String.class));
    }

    public String getJti(Claims c) {
        return c.getId();
    }

    public String getUserId(Claims c) {
        return c.getSubject();
    }

    public String getFamilyId(Claims c) {
        return c.get("familyId", String.class);
    }

    public Date getIat(Claims c) {
        return c.getIssuedAt();
    }

    public Date getExp(Claims c) {
        return c.getExpiration();
    }

    // 만료 시간을 외부에서 쓰고 싶다면 노출
    public long getAccessTtlMs() {
        return ACCESS_EXP_MS;
    }

    public long getRefreshTtlMs() {
        return REFRESH_EXP_MS;
    }
}
