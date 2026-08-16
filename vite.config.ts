/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Bindet die globalen Seiten-Bausteine (Navigation, Footer, Cookie-Banner,
 * Consent-Mode) beim Build direkt in index.html ein. Dadurch bleibt dist/
 * selbsttragend -- kein SSI, kein zusaetzlicher Request zur Laufzeit --, waehrend
 * die Bausteine als eigene Dateien unter partials/ pflegbar bleiben.
 *
 * Ersetzt Platzhalter der Form <!--INJECT:name--> durch partials/name.html.
 */
function injectPartials(): Plugin {
  return {
    name: 'inject-partials',
    transformIndexHtml(html) {
      return html.replace(/<!--INJECT:([a-z-]+)-->/g, (_match, name: string) => {
        const file = fileURLToPath(new URL(`./partials/${name}.html`, import.meta.url))
        return readFileSync(file, 'utf8')
      })
    },
  }
}

export default defineConfig({
  // Ausgeliefert unter https://kodinitools.com/texteditor/
  // -> alle Asset-URLs in dist/index.html werden mit diesem Praefix gebaut.
  base: '/texteditor/',
  plugins: [
    vue(),
    injectPartials(),
    /**
     * PWA / Offline. Erzeugt einen Service Worker, der die App-Shell und alle
     * gebauten Assets vorab cacht -- danach laeuft der Editor vollstaendig
     * offline (Dokumente liegen ohnehin nur lokal). Das vorhandene
     * `public/site.webmanifest` bleibt die Quelle fuers Manifest
     * (`manifest: false`); registriert wird per Vue-Composable (siehe
     * components/PwaPrompt.vue), damit Updates dem Nutzer angeboten statt
     * unbemerkt eingespielt werden.
     */
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        // Alle gebauten Dateien vorab cachen -- auch die faul geladenen
        // PDF-Chunks (jspdf/html2canvas), damit der Export offline funktioniert.
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,json}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // History-Routen (z. B. /texteditor/preview) offline auf die App-Shell.
        navigateFallback: '/texteditor/index.html',
        navigateFallbackDenylist: [/^\/texteditor\/(sw\.js|workbox-)/],
        runtimeCaching: [
          {
            // Eigene Schriften (liegen unter dem Site-Root, nicht im Build).
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && url.pathname.startsWith('/public/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kodini-fonts',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Schriftliste -- nach dem Build erzeugt, daher nur zur Laufzeit.
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && url.pathname === '/texteditor/fonts.json',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'kodini-fontlist' },
          },
          {
            // App-Icons/Logo aus dem Site-Root.
            urlPattern: ({ url, sameOrigin }: { url: URL; sameOrigin: boolean }) =>
              sameOrigin && /^\/(images?|public)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'kodini-media',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
