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

export const blogArticles: BlogArticle[] = [
  {
    id: 'texteditor-online',
    tag: { de: 'Ratgeber', en: 'Guide' },
    url: {
      de: 'https://kodinitools.com/blog/texteditor-online/',
      en: 'https://kodinitools.com/blog/texteditor-online/',
    },
    title: {
      de: 'Texteditor online: kostenlos schreiben, formatieren und als PDF speichern',
      en: 'Online text editor: write, format and save as PDF for free',
    },
    description: {
      de: 'Wie du mit dem Kodini Texteditor Texte im Browser schreibst, formatierst und als PDF, Markdown oder HTML exportierst – ohne Anmeldung und ohne Upload.',
      en: 'How to write and format texts in your browser with the Kodini Text Editor and export them as PDF, Markdown or HTML – no sign-up, no upload.',
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
