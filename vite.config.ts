/// <reference types="vitest" />
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

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
  plugins: [vue(), injectPartials()],
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
