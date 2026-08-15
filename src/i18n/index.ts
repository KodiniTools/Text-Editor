/**
 * Kleine, abhaengigkeitsfreie i18n-Schicht (DE/EN).
 *
 * Kein vue-i18n: der Editor hat eine ueberschaubare, feste Menge an Texten,
 * und eine getippte Nachrichtentabelle (siehe messages.ts) gibt Autovervoll-
 * staendigung sowie Compilerfehler bei fehlenden Schluesseln -- ohne Bundle-
 * Zuwachs und ohne Laufzeit-Compiler (relevant unter strenger CSP).
 */

import { computed, ref, type ComputedRef } from 'vue'
import { MESSAGES, type Messages } from './messages'

export type Locale = 'de' | 'en'

export const LOCALES: Locale[] = ['de', 'en']

const STORAGE_KEY = 'kodini-editor-locale-v1'

function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en'
}

/** Bevorzugte Sprache: gespeichert > Browser > Deutsch. */
function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    /* localStorage evtl. blockiert */
  }
  if (typeof navigator !== 'undefined') {
    const langs = navigator.languages ?? [navigator.language]
    for (const l of langs) {
      if (typeof l === 'string' && l.toLowerCase().startsWith('en')) return 'en'
      if (typeof l === 'string' && l.toLowerCase().startsWith('de')) return 'de'
    }
  }
  return 'de'
}

const locale = ref<Locale>(detectLocale())

/** Spiegelt die Sprache auf <html lang> -- fuer Vorlesehilfen und Suchmaschinen. */
function applyDocumentLang(l: Locale): void {
  if (typeof document !== 'undefined') document.documentElement.lang = l
}
applyDocumentLang(locale.value)

export function setLocale(next: Locale): void {
  if (!isLocale(next) || next === locale.value) return
  locale.value = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  applyDocumentLang(next)
}

/** Nachrichten der aktuellen Sprache -- fuer Nicht-Komponenten (z. B. Store). */
export function messages(): Messages {
  return MESSAGES[locale.value]
}

/**
 * Composable fuer Komponenten. `t` ist reaktiv: wechselt die Sprache, rendern
 * alle Templates, die `t` verwenden, automatisch neu.
 */
export function useI18n(): {
  locale: typeof locale
  setLocale: typeof setLocale
  t: ComputedRef<Messages>
} {
  return {
    locale,
    setLocale,
    t: computed(() => MESSAGES[locale.value]),
  }
}
