// sw.js (Workbox v6+ 예시)
import {registerRoute} from 'workbox-routing';
import {NetworkOnly} from 'workbox-strategies';
import {setCatchHandler} from 'workbox-routing';
import {cleanupOutdatedCaches} from 'workbox-precaching';

// 구버전 캐시 정리
cleanupOutdatedCaches();

// ❗ API는 절대 캐시 금지 + 네트워크만
registerRoute(
  ({url, request}) => url.pathname.startsWith('/api/') || request.url.includes('/api/'),
  new NetworkOnly(),
  'GET'
);
registerRoute(
  ({url, request}) => url.pathname.startsWith('/api/') || request.url.includes('/api/'),
  new NetworkOnly(),
  'POST'
);

// SPA 네비게이션 fallback 사용 시, API/DOCS 등은 제외
workbox.routing.registerNavigationRoute('/index.html', {
  denylist: [
    new RegExp('^/api/'), 
    new RegExp('^/swagger'), 
    new RegExp('\\.(?:png|jpg|jpeg|gif|svg|json)$')
  ],
});

// (선택) 전역 에러 핸들러
setCatchHandler(async ({event}) => {
  // navigate 요청이면 오프라인 페이지 등 반환, 그 외는 그냥 실패
  if (event.request.mode === 'navigate') {
    return caches.match('/offline.html') || Response.error();
  }
  return Response.error();
});
