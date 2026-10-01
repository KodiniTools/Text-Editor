// ==========================================================================
// Blog-Beitraege zum Texteditor auf kodinitools.com/blog
//
// Wird auf der Blogseite (BlogView.vue, "Aus dem Blog") als Karten angezeigt
// -- gleiches Muster wie im Visualizer (src/data/blogArticles.js). Ein neuer
// Beitrag ist ein weiteres Objekt in `blogArticles`.
// ==========================================================================

import type { Locale } from '@/i18n'

export type LocalizedText = Record<Locale, string>

export interface BlogArticle {
  /** Eindeutige Kennung (Vue-Key). */
  id: string
  /** Veroeffentlichungsdatum als ISO-Datum (YYYY-MM-DD); ohne Angabe keine Datumszeile. */
  date?: string
  /** Lesezeit in Minuten; ohne Angabe nicht angezeigt. */
  minutes?: number
  tag: LocalizedText
  /** Vollstaendige URL des Beitrags je Sprache. */
  url: LocalizedText
  /** Vorschaubild (16:9) je Sprache; ohne Angabe zeigt die Karte eine stilisierte Seite. */
  image?: LocalizedText
  title: LocalizedText
  description: LocalizedText
}

// Daten 1:1 aus KodiniTools/Kodinitools-Home (src/pages/blog/index.astro bzw.
// src/pages/en/blog/index.astro). Bilder liegen im Web-Root der Domain.
export const blogArticles: BlogArticle[] = [
  {
    id: 'texteditor-online',
    date: '2026-09-16',
    minutes: 5,
    tag: { de: 'Text', en: 'Text' },
    url: {
      de: 'https://kodinitools.com/blog/texteditor-online/',
      en: 'https://kodinitools.com/en/blog/online-text-editor/',
    },
    image: {
      de: 'https://kodinitools.com/image/texteditor-de.png',
      en: 'https://kodinitools.com/image/texteditor-en.png',
    },
    title: {
      de: 'Texteditor online: Texte schreiben, formatieren & exportieren ohne Installation',
      en: 'Online Text Editor: Write, Format & Export Text Without Installing Anything',
    },
    description: {
      de: 'Schreiben, formatieren, Bilder einfügen, Markdown-Vorschau, Wortzähler, Drucken und Speichern – kostenlos im Browser, ohne Upload.',
      en: 'Write, format, insert images, Markdown preview, word counter, print and save — free in your browser, no upload.',
    },
  },
]

/** Beitraege nach Datum absteigend (neuester zuerst); undatierte am Ende. */
export function getBlogArticlesNewestFirst(): BlogArticle[] {
  return [...blogArticles].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
}

const DATE_LOCALES: Record<Locale, string> = { de: 'de-CH', en: 'en-US' }

/** Datum sprachabhaengig: de "21. September 2026", en "September 21, 2026". */
export function formatBlogDate(isoDate: string, locale: Locale): string {
  const date = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString(DATE_LOCALES[locale], {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
