import { clientsClaim } from 'workbox-core';
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

self.skipWaiting();
clientsClaim();

// 기존 프리캐시 목록 등록
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// ✅ /api/v1 요청은 캐시에서 제외
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1'),
  null // 가로채지 않음
);

// 이미지 캐시 전략
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

// 정적 리소스 캐시 전략
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && !url.pathname.startsWith('/api/v1'),
  new StaleWhileRevalidate({ cacheName: 'static-resources' })
);

// SPA 라우팅 지원
registerRoute(
  new NavigationRoute(new StaleWhileRevalidate({ cacheName: 'pages' }), {
    allowlist: [/^\/$/],
  })
);
