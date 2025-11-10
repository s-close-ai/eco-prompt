import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import svgr from 'vite-plugin-svgr';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    svgr(),
    VitePWA({
      injectRegister: false, // service worker 등록 코드 주입 비활성화
      // workbox 옵션 제거로 service worker 파일 생성 방지
      manifest: {
        name: 'Eco Prompt',
        short_name: 'EcoPrompt',
        description: 'Eco Prompt PWA',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: '/logo/wgb_logo_png_name.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo/wgb_logo_png_name.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
        shortcuts: [
          {
            name: '홈',
            short_name: '홈',
            url: '/',
            icons: [{ src: '/logo/wgb_logo_png_name.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
