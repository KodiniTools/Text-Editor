import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import globals from 'globals'

// Flat-Config fuer ESLint 9/10.
// - Code-Qualitaet: typescript-eslint + eslint-plugin-vue (empfohlene Regeln)
// - Formatierung bleibt bei Prettier; skipFormatting schaltet alle Regeln ab,
//   die sich mit Prettier ueberschneiden, damit sich beide nicht widersprechen.
export default defineConfigWithVueTs(
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**']),

  {
    name: 'app/dateien',
    files: ['**/*.{ts,mts,vue}'],
  },

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  // Browser-Globals fuer die App (window, document, localStorage, FontFace ...).
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Node-Globals fuer Build-/Tooling-Dateien.
  {
    files: ['*.{ts,js,mjs}', 'vite.config.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Tests: Node + Browser (jsdom), die vitest-APIs werden explizit importiert.
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  skipFormatting,
)
