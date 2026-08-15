/**
 * Zentrale Schriftarten-Liste des Editors.
 *
 * Systemschriften stehen in BUILTIN_FONTS, eigene Webfonts in CUSTOM_FONTS.
 * Eigene Fonts werden erst geladen, wenn sie ausgewaehlt werden (FontFace-API),
 * damit der Editor ohne Auswahl weiterhin ohne einen einzigen Netzwerkaufruf
 * auskommt.
 */

import { readonly, shallowRef, type Ref } from 'vue'
import { groupFontFiles, sortByFormatPreference } from '@/utils/fontFiles'

export interface FontSource {
  /** Dateiname relativ zu CUSTOM_FONT_BASE oder absolute URL. */
  url: string
  /** CSS font-weight, z. B. '400' oder '700'. Default: '400'. */
  weight?: string
  /** CSS font-style, z. B. 'italic'. Default: 'normal'. */
  style?: string
}

export interface EditorFont {
  /** Stabile ID -- wird in den Settings gespeichert, nicht mehr aendern. */
  id: string
  /** Beschriftung in der Format-Leiste. */
  label: string
  /** Vollstaendiger CSS-Stack inkl. Fallbacks. */
  stack: string
  /** Nur bei Webfonts: font-family-Name, unter dem die Dateien registriert werden. */
  family?: string
  /** Nur bei Webfonts: die zu ladenden Dateien. */
  sources?: FontSource[]
}

/**
 * Basis-URL der eigenen Schriften.
 * Serverpfad: /var/www/kodinitools.com/public/fonts/
 * -> erreichbar unter https://kodinitools.com/public/fonts/
 */
export const CUSTOM_FONT_BASE = '/public/fonts/'

export const BUILTIN_FONTS: EditorFont[] = [
  { id: 'sans', label: 'Sans', stack: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'serif', label: 'Serif', stack: 'ui-serif, Georgia, Cambria, serif' },
  { id: 'mono', label: 'Mono', stack: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
]

/**
 * Baut einen Eintrag fuer eine eigene Schrift.
 *
 * @param id       Stabile ID fuer die Settings (z. B. 'kodini')
 * @param label    Anzeigename in der Format-Leiste
 * @param family   font-family-Name, frei waehlbar, muss nur eindeutig sein
 * @param files    Dateien im Ordner /public/fonts (woff2 bevorzugt)
 * @param fallback Fallback-Stack, falls die Datei nicht laedt
 */
export function customFont(
  id: string,
  label: string,
  family: string,
  files: FontSource[],
  fallback = 'ui-sans-serif, system-ui, sans-serif',
): EditorFont {
  return {
    id,
    label,
    family,
    stack: `"${family}", ${fallback}`,
    sources: files.map((f) => ({
      ...f,
      url:
        /^(https?:)?\/\//.test(f.url) || f.url.startsWith('/') ? f.url : CUSTOM_FONT_BASE + f.url,
    })),
  }
}

/**
 * Von Hand eingetragene Schriften.
 *
 * Normalerweise leer: die Schriften aus /var/www/kodinitools.com/public/fonts
 * findet discoverFonts() von allein. Hier eintragen, wenn eine Schrift eine
 * eigene Beschriftung braucht oder aus einer anderen Quelle kommt:
 *
 *   customFont('kodini', 'Kodini Sans', 'KodiniSans', [
 *     { url: 'KodiniSans-Regular.woff2' },
 *     { url: 'KodiniSans-Bold.woff2', weight: '700' },
 *   ]),
 */
export const CUSTOM_FONTS: EditorFont[] = []

export const DEFAULT_FONT_ID = 'sans'

/**
 * Die Liste waechst zur Laufzeit um die Schriften, die auf dem Server im
 * Ordner /public/fonts liegen -- deshalb reaktiv statt konstant.
 */
const registry = shallowRef<EditorFont[]>([...BUILTIN_FONTS, ...CUSTOM_FONTS])

/** Alle derzeit waehlbaren Schriften. */
export const fontList = readonly(registry) as Readonly<Ref<readonly EditorFont[]>>

export function allFonts(): readonly EditorFont[] {
  return registry.value
}

/** Fuegt Schriften hinzu; bereits bekannte IDs bleiben unveraendert. */
export function registerFonts(fonts: EditorFont[]): void {
  const known = new Set(registry.value.map((f) => f.id))
  const added = fonts.filter((f) => !known.has(f.id))
  if (added.length) registry.value = [...registry.value, ...added]
}

export function findFont(id: string): EditorFont {
  return registry.value.find((f) => f.id === id) ?? BUILTIN_FONTS[0]!
}

export function isKnownFont(id: string): boolean {
  return registry.value.some((f) => f.id === id)
}

/**
 * Liest die vom Deploy erzeugte Datei fonts.json und macht aus den
 * Dateinamen fertige Eintraege fuer die Auswahl.
 *
 * Die Datei liegt neben der index.html. Fehlt sie (Dev-Server, Ordner leer),
 * passiert nichts -- die Systemschriften bleiben.
 *
 * @returns Anzahl der neu gefundenen Schriften.
 */
export async function discoverFonts(baseUrl = '/'): Promise<number> {
  if (typeof fetch !== 'function') return 0
  try {
    const res = await fetch(`${baseUrl}fonts.json`, { cache: 'no-cache' })
    if (!res.ok) return 0
    const data: unknown = await res.json()
    const files = Array.isArray(data) ? data.filter((f): f is string => typeof f === 'string') : []
    if (!files.length) return 0

    const fonts = groupFontFiles(sortByFormatPreference(files)).map((group) =>
      customFont(
        `datei:${group.familyKey.toLowerCase()}`,
        group.label,
        group.familyKey,
        group.files.map((f) => ({
          url: encodeURIComponent(f.file),
          weight: f.weight,
          style: f.style,
        })),
      ),
    )
    const before = registry.value.length
    registerFonts(fonts)
    return registry.value.length - before
  } catch {
    // Kein Netz, kaputtes JSON, alter Server -- kein Grund, die App zu stoeren.
    return 0
  }
}

function formatFromUrl(url: string): string {
  const ext = url.split('?')[0]!.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'woff2':
      return 'woff2'
    case 'woff':
      return 'woff'
    case 'otf':
      return 'opentype'
    default:
      return 'truetype'
  }
}

/** Laufende/abgeschlossene Ladevorgaenge -- jede Schrift wird nur einmal geladen. */
const loading = new Map<string, Promise<boolean>>()

/**
 * Laedt die Dateien einer eigenen Schrift und registriert sie im Dokument.
 * Systemschriften brauchen nichts zu tun.
 *
 * @returns true, wenn die Schrift nutzbar ist (oder keine Datei noetig war).
 *          Bei einem Fehler false -- der CSS-Fallback greift dann automatisch.
 */
export function loadFont(font: EditorFont): Promise<boolean> {
  if (!font.sources?.length || !font.family) return Promise.resolve(true)

  // In Testumgebungen (jsdom) gibt es weder FontFace noch document.fonts.
  if (typeof FontFace === 'undefined' || typeof document === 'undefined' || !document.fonts) {
    return Promise.resolve(false)
  }

  const cached = loading.get(font.id)
  if (cached) return cached

  const family = font.family
  const task = Promise.all(
    font.sources.map(async (src) => {
      const face = new FontFace(family, `url("${src.url}") format("${formatFromUrl(src.url)}")`, {
        weight: src.weight ?? '400',
        style: src.style ?? 'normal',
        display: 'swap',
      })
      document.fonts.add(await face.load())
    }),
  )
    .then(() => true)
    .catch(() => {
      // Nicht erneut versuchen, aber auch nicht die App stoeren.
      return false
    })

  loading.set(font.id, task)
  return task
}
