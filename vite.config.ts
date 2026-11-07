
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'favicon.ico',
        'favicon.png',
        'apple-touch-icon.png',
        'icon.svg',
        'icon-maskable.svg',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
        'manifest.webmanifest',
        'manifest.json',
        'version.json'
      ],
      manifest: {
        id: '/',
        name: 'Depend Sourcing Ltd.',
        short_name: 'Depend Sourcing',
        description: 'Office Management, Automated Billing & Financial Control Center for Depend Sourcing Ltd.',
        theme_color: '#0b192c',
        background_color: '#0b192c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,webmanifest,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\/.*/],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/(cdn\.tailwindcss\.com|cdnjs\.cloudflare\.com)\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'external-cdn-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^\/api\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-firebase': ['firebase/app', 'firebase/database'],
          'vendor-leaflet': ['leaflet', 'react-leaflet'],
          'vendor-charts': ['recharts'],
          'vendor-motion': ['motion/react'],
          'vendor-utils': ['localforage', 'bangla-date-converter']
        }
      }
    }
  },
  server: {
    hmr: false
  },
  define: {
    'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(process.env.GOOGLE_MAPS_PLATFORM_KEY || ''),
    '__APP_VERSION__': JSON.stringify('1.1.0'),
    '__BUILD_TIMESTAMP__': JSON.stringify(new Date().toISOString()),
    '__BUILD_COMMIT__': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA || process.env.COMMIT_REF || 'local-build')
  }
});
