/**
 * Kleine, abhaengigkeitsfreie i18n-Schicht (DE/EN).
 *
 * Kein vue-i18n: der Editor hat eine ueberschaubare, feste Menge an Texten,
 * und eine getippte Nachrichtentabelle (siehe messages.ts) gibt Autovervoll-
 * staendigung sowie Compilerfehler bei fehlenden Schluesseln -- ohne Bundle-
 * Zuwachs und ohne Laufzeit-Compiler (relevant unter strenger CSP).
 *
 * Integration mit der globalen KodiniTools-Seite: Navigation, Footer und
 * Cookie-Banner nutzen `localStorage['locale']` und das Fenster-Event
 * `locale-changed`. Diese Schicht teilt sich dieselbe Quelle -- ein
 * Sprachwechsel hier aktualisiert die globalen Bausteine und umgekehrt.
 */

import { computed, ref, type ComputedRef } from 'vue'
import { MESSAGES, type Messages } from './messages'

export type Locale = 'de' | 'en'

export const LOCALES: Locale[] = ['de', 'en']

/** Gemeinsamer Schluessel mit Navigation/Footer/Cookie-Banner. */
const STORAGE_KEY = 'locale'
/** Frueherer, editor-eigener Schluessel -- nur noch zum Migrieren gelesen. */
const LEGACY_KEY = 'kodini-editor-locale-v1'
const EVENT = 'locale-changed'

function isLocale(value: unknown): value is Locale {
  return value === 'de' || value === 'en'
}

function readStored(): Locale | null {
  try {
    const shared = localStorage.getItem(STORAGE_KEY)
    if (isLocale(shared)) return shared
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (isLocale(legacy)) return legacy
  } catch {
    /* localStorage evtl. blockiert */
  }
  return null
}

/** Bevorzugte Sprache: gespeichert > Browser > Deutsch. */
function detectLocale(): Locale {
  const stored = readStored()
  if (stored) return stored
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

// Beim ersten Besuch die erkannte Sprache in den gemeinsamen Schluessel
// schreiben, damit Navigation/Footer/Cookie-Banner (die ihn beim Laden lesen)
// dieselbe Sprache zeigen -- sonst faenden sie nichts vor und fielen auf Deutsch
// zurueck, waehrend der Editor z. B. Englisch anzeigt.
try {
  if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, locale.value)
} catch {
  /* localStorage evtl. blockiert */
}

/** Spiegelt die Sprache auf <html lang> -- fuer Vorlesehilfen und Suchmaschinen. */
function applyDocumentLang(l: Locale): void {
  if (typeof document !== 'undefined') document.documentElement.lang = l
}
applyDocumentLang(locale.value)

/** Setzt die Sprache lokal, ohne ein Event auszuloesen (Empfang von aussen). */
function applyLocale(next: Locale): void {
  if (!isLocale(next) || next === locale.value) return
  locale.value = next
  applyDocumentLang(next)
}

export function setLocale(next: Locale): void {
  if (!isLocale(next) || next === locale.value) return
  applyLocale(next)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* ignore */
  }
  // Navigation, Footer und Cookie-Banner lauschen auf dieses Event.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { locale: next } }))
  }
}

// Sprachwechsel aus der globalen Navigation (oder einem anderen Baustein)
// uebernehmen -- ohne das Event erneut auszuloesen, um Schleifen zu vermeiden.
if (typeof window !== 'undefined') {
  window.addEventListener(EVENT, (event) => {
    const detail = (event as CustomEvent).detail as { locale?: unknown } | undefined
    const next = detail?.locale
    if (isLocale(next)) applyLocale(next)
    else {
      const stored = readStored()
      if (stored) applyLocale(stored)
    }
  })
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
