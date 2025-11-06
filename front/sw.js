// sw.js
import {registerRoute, NavigationRoute} from 'workbox-routing';
import {NetworkOnly} from 'workbox-strategies';
import {setCatchHandler} from 'workbox-routing';
import {cleanupOutdatedCaches, precacheAndRoute} from 'workbox-precaching';

// 구버전 캐시 정리
cleanupOutdatedCaches();

// 프리캐시 설정 (빌드 시 자동 주입)
precacheAndRoute(self.__WB_MANIFEST || []);

// ✅ API 요청은 항상 네트워크만 사용 (모든 HTTP 메소드)
registerRoute(
  ({url, request}) => {
    // 더 정확한 API 경로 매칭
    return url.pathname.startsWith('/api/') || 
           url.href.includes('/api/');
  },
  new NetworkOnly({
    networkTimeoutSeconds: 10, // 타임아웃 설정
  })
);

// ✅ 추가: 다른 외부 API 도메인도 제외하려면
registerRoute(
  ({url}) => {
    // 외부 API 도메인 목록
    const apiDomains = ['api.example.com', 'backend.yourservice.com'];
    return apiDomains.some(domain => url.hostname.includes(domain));
  },
  new NetworkOnly()
);

// ✅ SPA 네비게이션 fallback (API 제외)
const navigationRoute = new NavigationRoute(
  // 네비게이션 요청에 대한 핸들러
  async ({event}) => {
    try {
      // 네트워크에서 먼저 시도
      return await fetch(event.request);
    } catch (error) {
      // 오프라인이면 index.html 반환
      return caches.match('/index.html');
    }
  },
  {
    // API, Swagger, 정적 파일 등은 제외
    denylist: [
      /^\/api\//,
      /^\/swagger/,
      /\.(?:png|jpg|jpeg|gif|svg|json|js|css|woff2?)$/,
    ],
  }
);
registerRoute(navigationRoute);

// ✅ 전역 에러 핸들러
setCatchHandler(async ({event, request}) => {
  // API 요청 실패 시 - 에러를 그대로 전파
  if (request.url.includes('/api/')) {
    return Response.error();
  }
  
  // 네비게이션 요청 실패 시 - 오프라인 페이지
  if (request.mode === 'navigate') {
    const cache = await caches.open('offline-cache');
    const cachedResponse = await cache.match('/offline.html');
    return cachedResponse || Response.error();
  }
  
  return Response.error();
});