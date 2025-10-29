import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import svgr from 'vite-plugin-svgr'

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
      registerType: 'autoUpdate',
      injectRegister: 'auto',
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
          { src: '/logo/wgb_logo_png_name.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/logo/wgb_logo_png_name.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
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
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url }) => url.origin === self.location.origin,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'static-resources' },
          },
        ],
      },
      devOptions: { enabled: true, navigateFallback: 'index.html', suppressWarnings: true },
    }),
  ],
})
