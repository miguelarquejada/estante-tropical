import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const googleKey = env.GOOGLE_BOOKS_KEY ? `&key=${encodeURIComponent(env.GOOGLE_BOOKS_KEY)}` : ''
  return {
  server: {
    proxy: {
      '/api/books': {
        target: 'https://www.googleapis.com',
        changeOrigin: true,
        rewrite: (path: string) => path.replace('/api/books', '/books/v1/volumes') + googleKey,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Estante Tropical',
        short_name: 'Estante',
        description: 'Organize suas leituras pelo tempo investido em cada livro.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#FDFBF7',
        theme_color: '#FDFBF7',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/auth\//, /^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname === '/api/books',
            handler: 'NetworkFirst',
            options: { cacheName: 'google-books-api', networkTimeoutSeconds: 5, expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image' && !request.url.startsWith(self.location.origin),
            handler: 'CacheFirst',
            options: {
              cacheName: 'book-covers',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 90 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  }
})
