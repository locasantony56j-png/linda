import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/cdn-icons-png\.flaticon\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'flaticon-icons',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/picsum\.photos\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'picsum-images',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                }
              }
            }
          ]
        },
        manifest: {
          name: 'Bristy Health Care',
          short_name: 'BristyHealth',
          description: 'A futuristic medical and educational platform for students in Bangladesh.',
          theme_color: '#10b981',
          background_color: '#000000',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '.',
          icons: [
            {
              src: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'https://cdn-icons-png.flaticon.com/512/883/883356.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'node-fetch': path.resolve(__dirname, 'src/dummy-fetch.ts'),
        'formdata-polyfill': path.resolve(__dirname, 'src/dummy-formdata.ts'),
        'formdata-polyfill/esm.min.js': path.resolve(__dirname, 'src/dummy-formdata.ts'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
