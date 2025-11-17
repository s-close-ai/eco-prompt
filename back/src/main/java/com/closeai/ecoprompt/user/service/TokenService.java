package com.closeai.ecoprompt.user.service;

import a306.dependency_logger_starter.logging.annotation.NoLogging;
import com.closeai.ecoprompt.common.logging.AppLogger;
import com.closeai.ecoprompt.security.cookie.TokenCookieManager;
import com.closeai.ecoprompt.security.jwt.JwtUtil;
import com.closeai.ecoprompt.security.jwt.dto.response.IssueResponse;
import com.closeai.ecoprompt.user.model.entity.RefreshSession;
import com.closeai.ecoprompt.user.repository.redis.RefreshSessionRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@NoLogging
public class TokenService {

    private final JwtUtil jwt;
    private final RefreshSessionRepository repo;
    private final TokenCookieManager cookies;

    // ===== 기존 발급/회전 메서드는 그대로 유지 =====
    public IssueResponse issueOnLogin(String userId, String email, String roles, Integer tokenVersion) {
        AppLogger.start("로그인 시작 시 토큰 생성 시작");

        String familyId = UUID.randomUUID().toString();
        String accessJwt = jwt.issueAccess(userId, email, roles, tokenVersion);
        String refreshJwt = jwt.issueRefresh(userId, familyId);

        Claims rc = jwt.parseClaimsStrict(refreshJwt);
        String rjti = jwt.getJti(rc);

        RefreshSession session = RefreshSession.builder()
                .jti(rjti).userId(userId).familyId(familyId)
                .exp(System.currentTimeMillis() + jwt.getRefreshTtlMs())
                .build();
        repo.save(session, Duration.ofMillis(jwt.getRefreshTtlMs()));

        AppLogger.complete("로그인 시작 시 토큰 생성 완료 및 Redis 저장");
        return new IssueResponse(accessJwt, refreshJwt);
    }

    public IssueResponse rotate(String refreshJwtCookie, String email, String roles, Integer tokenVersion) {
        AppLogger.start("Access & Refresh 토큰 재생성 시작");

        Claims rc = jwt.parseClaimsStrict(refreshJwtCookie);
        if (!jwt.isRefresh(rc)) throw new SecurityException("Not a refresh token");

        String userId = jwt.getUserId(rc);
        String oldJti = jwt.getJti(rc);
        String familyId = jwt.getFamilyId(rc);

        RefreshSession old = repo.find(oldJti).orElse(null);
        if (old == null) {
            // 현재 redis에 없는 refresh token으로 재발급 받으려고 할 시에 관련 유저 모든 장치 로그아웃
            repo.deleteAllSessionsByFamilyId(userId, familyId); // 같은 family 전체 삭제
            repo.setLogoutAfter(userId, System.currentTimeMillis()); // 모든 access 즉시 무효
            throw new SecurityException("Refresh reuse suspected (family revoked)");
        }

        String newRefresh = jwt.issueRefresh(userId, familyId);
        Claims nrc = jwt.parseClaimsStrict(newRefresh);
        String newJti = jwt.getJti(nrc);

        RefreshSession newSession = RefreshSession.builder()
                .jti(newJti).userId(userId).familyId(familyId)
                .exp(System.currentTimeMillis() + jwt.getRefreshTtlMs())
                .build();

        repo.save(newSession, Duration.ofMillis(jwt.getRefreshTtlMs()));
        repo.delete(userId, oldJti);

        String newAccess = jwt.issueAccess(userId, email, roles, tokenVersion);

        AppLogger.complete("Access & Refresh 토큰 재생성 완료");
        return new IssueResponse(newAccess, newRefresh);
    }

    public void logoutCurrent(String userId, String refreshJwtCookie) {
        AppLogger.start("현재 유저 로그아웃 시도");

        Claims rc = jwt.parseClaimsStrict(refreshJwtCookie);
        if (!jwt.isRefresh(rc)) return;

        String jti = jwt.getJti(rc);

        AppLogger.complete("현재 유저 로그아웃 완료");
        repo.delete(userId, jti);
    }

    public void logoutAll(String userId) {
        repo.setLogoutAfter(userId, System.currentTimeMillis());
        repo.deleteAllSessions(userId);
    }

    public void validateAccessOrThrow(String accessJwt) {
        Claims ac = jwt.parseClaimsStrict(accessJwt);
        if (!jwt.isAccess(ac)) throw new SecurityException("Not an access token");

        String userId = jwt.getUserId(ac);
        long iatMs = jwt.getIat(ac).getTime();
        long cut = repo.getLogoutAfter(userId); // 없으면 0
        if (iatMs < cut) {
            throw new SecurityException("Globally logged out");
        }
    }

    public int getAccessMaxAgeSec() {
        return (int) (jwt.getAccessTtlMs() / 1000);
    }

    public int getRefreshMaxAgeSec() {
        return (int) (jwt.getRefreshTtlMs() / 1000);
    }

    public JwtUtil getJwtUtil() {
        return jwt;
    }

    // ====== (추가) 컨트롤러 없는 엔드포인트용 진입점 ======
    // 리프레시 전체 처리 (쿠키 추출 → 회전 → 쿠키 재세팅 → 상태 코드 반환)
    public void handleRefresh(HttpServletRequest req, HttpServletResponse res,
                              String email, String roles, Integer tokenVersion) {
        AppLogger.info("리프레시 처리");
        try {
            String refresh = cookies.findRefreshCookieOrThrow(req).getValue();
            IssueResponse rotated = rotate(refresh, email, roles, tokenVersion);
            cookies.writeAuthCookies(res,
                    rotated.getAccessToken(), getAccessMaxAgeSec(),
                    rotated.getRefreshToken(), getRefreshMaxAgeSec());
            res.setStatus(HttpServletResponse.SC_OK);
        } catch (Exception e) {
            cookies.clearAuthCookies(res);
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        }
    }

    // 현재 기기 로그아웃 전체 처리 (쿠키에서 refresh 추출 → 세션 삭제 → 쿠키 삭제)
    public void handleLogoutCurrent(HttpServletRequest req, HttpServletResponse res) {
        try {
            String refresh = cookies.findRefreshCookieOrThrow(req).getValue();
            Claims rc = jwt.parseClaimsStrict(refresh);
            logoutCurrent(jwt.getUserId(rc), refresh);
        } catch (Exception ignored) {
            // 쿠키 없음/파싱 실패도 쿠키만 지우고 200 OK 처리
        } finally {
            cookies.clearAuthCookies(res);
        }
    }
}
