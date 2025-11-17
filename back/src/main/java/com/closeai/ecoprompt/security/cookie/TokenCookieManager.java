package com.closeai.ecoprompt.security.cookie;

import a306.dependency_logger_starter.logging.annotation.NoLogging;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
@NoLogging
public class TokenCookieManager {

    public static final String ACCESS_COOKIE  = "ACCESS_TOKEN";
    public static final String REFRESH_COOKIE = "REFRESH_TOKEN";
    public static final String COOKIE_PATH    = "/";

    private static final boolean HTTP_ONLY = true;
    private static final boolean SECURE    = true; // prod는 true 권장
    private static final String  SAME_SITE = "Lax";

    public Cookie findRefreshCookieOrThrow(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) throw new IllegalStateException("리프레시 쿠키가 없습니다.");
        return Arrays.stream(cookies)
                .filter(c -> REFRESH_COOKIE.equals(c.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("리프레시 쿠키가 없습니다."));
    }

    public void writeAuthCookies(HttpServletResponse res, String access, int accessMaxAgeSec,
                                 String refresh, int refreshMaxAgeSec) {
        addCookie(res, ACCESS_COOKIE, access, accessMaxAgeSec);
        addCookie(res, REFRESH_COOKIE, refresh, refreshMaxAgeSec);
    }

    public void clearAuthCookies(HttpServletResponse res) {
        deleteCookie(res, ACCESS_COOKIE);
        deleteCookie(res, REFRESH_COOKIE);
    }

    // -------- internal --------
    private void addCookie(HttpServletResponse res, String name, String value, int maxAgeSec) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(HTTP_ONLY);
        cookie.setSecure(SECURE);
        cookie.setPath(COOKIE_PATH);
        cookie.setMaxAge(maxAgeSec);
        res.addCookie(cookie);

        // SameSite 헤더 부가
        res.addHeader("Set-Cookie",
                String.format("%s=%s; Max-Age=%d; Path=%s; HttpOnly%s; SameSite=%s",
                        name, value, maxAgeSec, COOKIE_PATH, SECURE ? "; Secure" : "", SAME_SITE));
    }

    private void deleteCookie(HttpServletResponse res, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(HTTP_ONLY);
        cookie.setSecure(SECURE);
        cookie.setPath(COOKIE_PATH);
        cookie.setMaxAge(0);
        res.addCookie(cookie);
        res.addHeader("Set-Cookie",
                String.format("%s=; Max-Age=0; Path=%s; HttpOnly%s; SameSite=%s",
                        name, COOKIE_PATH, SECURE ? "; Secure" : "", SAME_SITE));
    }
}
