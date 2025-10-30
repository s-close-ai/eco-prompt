package com.closeai.ecoprompt.security.jwt;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;

@Component
public class JwtUtil {
    
    // 32바이트(이상) 비밀키 필요 (HS256 기준)
    // TODO: 값 변경 및 환경변수 처리 필요
    private static final String SECRET = "closeai-ecoprompt-ssafy-login-secret-key-123456";
    private static final long ACCESS_TOKEN_EXP_MS = 1000L * 60 * 60 * 3; // 3시간

    private final Key key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    public String generateToken(String email, String name) {
        return Jwts.builder()
                .subject(email)                       // setSubject 대체
                .claim("name", name)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + ACCESS_TOKEN_EXP_MS))
                .signWith(key)                        // 0.12.x는 알고리즘 생략 가능(키에서 유추)
                .compact();
    }

    public Claims validateAndParse(String token) {
        try {
            // 0.12.x 스타일 파서
            Jws<Claims> jws = Jwts.parser()          // parserBuilder() 아님!
                    .verifyWith((SecretKey) key)                 // 예전 setSigningKey(...) 대체
                    .build()
                    .parseSignedClaims(token);       // 예전 parseClaimsJws(...) 대체

            return jws.getPayload();                 // Claims
        } catch (Exception e) {
            return null; // 유효하지 않음
        }
    }
}