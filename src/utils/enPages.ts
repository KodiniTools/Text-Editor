// Englische Sprachfassungen, die der Build neben dist/index.html schreibt (vite.config.ts).
// Ohne Laufzeit-Abhängigkeiten (kein Vue, kein DOM), damit Build und Tests sie importieren
// können. Unterseiten heißen wie ihr Pfad (/app -> app.en.html), damit nginx sie für
// `?lang=en` per map findet.

/** Öffentliche URL der deutschen Startseite (wie SITE_URL in src/router/index.ts). */
export const SITE_URL = 'https://kodinitools.com/texteditor/'

export interface EnPage {
  /** Dateiname in dist/. */
  file: string
  /** Pfad relativ zu SITE_URL (wie `meta.canonical` der Route). */
  path: string
  /** Schlüssel in `MESSAGES.en.landing.meta` (wie `meta.metaKey` der Route). */
  metaKey: 'start' | 'app' | 'features' | 'blog'
}

export const EN_PAGES: readonly EnPage[] = [
  { file: 'index.en.html', path: '', metaKey: 'start' },
  { file: 'app.en.html', path: 'app', metaKey: 'app' },
  { file: 'funktionen.en.html', path: 'funktionen', metaKey: 'features' },
  { file: 'blog.en.html', path: 'blog', metaKey: 'blog' },
]
