/**
 * Zentrale Schriftarten-Liste des Editors.
 *
 * Systemschriften stehen in BUILTIN_FONTS, eigene Webfonts in CUSTOM_FONTS.
 * Eigene Fonts werden erst geladen, wenn sie ausgewaehlt werden (FontFace-API),
 * damit der Editor ohne Auswahl weiterhin ohne einen einzigen Netzwerkaufruf
 * auskommt.
 */

import { readonly, shallowRef, type Ref } from 'vue'
import { faceOrder, groupFontFiles, sortByFormatPreference, weightLabel } from '@/utils/fontFiles'

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
  /** Vollstaendige Beschriftung, z. B. 'Supreme Bold'. */
  label: string
  /** Familienname fuer die Gruppierung in der Auswahl, z. B. 'Supreme'. Fehlt bei Systemschriften. */
  group?: string
  /** Kurzform je Schnitt fuer die gruppierte Auswahl, z. B. 'Bold'. */
  faceLabel?: string
  /** Vollstaendiger CSS-Stack inkl. Fallbacks. */
  stack: string
  /** Gewicht, mit dem der Text dargestellt wird (CSS font-weight). */
  weight?: string
  /** Stil, mit dem der Text dargestellt wird (CSS font-style). */
  style?: string
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
 * Macht aus einer Dateiliste einen Auswahleintrag pro Schnitt.
 *
 * Frueher war jede Familie ein Eintrag, der nur den Regular-Schnitt zeigte --
 * dadurch fehlten Bold, Light usw. in der Auswahl. Jetzt wird jeder Schnitt zu
 * einem eigenen Eintrag ('Supreme Bold', 'Supreme Light', ...), gruppiert unter
 * dem Familiennamen. Jeder Eintrag laedt genau seine eine Datei.
 */
export function buildFontsFromFiles(files: string[]): EditorFont[] {
  const groups = groupFontFiles(sortByFormatPreference(files))
  const fonts: EditorFont[] = []

  for (const group of groups) {
    const faces = [...group.files].sort(
      (a, b) => faceOrder(a.weight, a.style) - faceOrder(b.weight, b.style),
    )
    for (const face of faces) {
      const faceLabel = weightLabel(face.weight, face.style)
      fonts.push({
        // ID enthaelt Familie + Schnitt, damit sie eindeutig und stabil ist.
        id: `datei:${group.familyKey.toLowerCase()}:${face.weight.replace(/\s+/g, '-')}:${face.style}`,
        label: `${group.label} ${faceLabel}`,
        faceLabel,
        group: group.label,
        family: group.familyKey,
        weight: face.weight,
        style: face.style,
        stack: `"${group.familyKey}", ui-sans-serif, system-ui, sans-serif`,
        sources: [
          {
            url: `${CUSTOM_FONT_BASE}${encodeURIComponent(face.file)}`,
            weight: face.weight,
            style: face.style,
          },
        ],
      })
    }
  }

  return fonts
}

/**
 * Liest die vom Deploy erzeugte Datei fonts.json und macht aus den
 * Dateinamen fertige Eintraege fuer die Auswahl.
 *
 * Die Datei liegt neben der index.html. Fehlt sie (Dev-Server, Ordner leer),
 * passiert nichts -- die Systemschriften bleiben.
 *
 * @returns Anzahl der neu gefundenen Schnitte.
 */
export async function discoverFonts(baseUrl = '/'): Promise<number> {
  if (typeof fetch !== 'function') return 0
  try {
    const res = await fetch(`${baseUrl}fonts.json`, { cache: 'no-cache' })
    if (!res.ok) return 0
    const data: unknown = await res.json()
    const files = Array.isArray(data) ? data.filter((f): f is string => typeof f === 'string') : []
    if (!files.length) return 0

    const before = registry.value.length
    registerFonts(buildFontsFromFiles(files))
    return registry.value.length - before
  } catch {
    // Kein Netz, kaputtes JSON, alter Server -- kein Grund, die App zu stoeren.
    return 0
  }
}

/** Laedt alle bekannten Webfonts -- fuer die Vorschau in der Schrift-Auswahl. */
export function loadAllFonts(): void {
  for (const font of registry.value) void loadFont(font)
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
  const sources = font.sources
  // Jeder Eintrag ist genau ein Schnitt (eine Datei) -- es wird also nur das
  // geladen, was der Eintrag darstellt, nicht die ganze Familie.
  const task = Promise.all(
    sources.map(async (src) => {
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
