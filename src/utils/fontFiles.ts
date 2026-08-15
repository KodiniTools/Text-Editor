/**
 * Leitet aus Font-Dateinamen Familie, Schnitt und Beschriftung ab.
 *
 * Damit muss niemand Schriften von Hand eintragen: der Server liefert eine
 * Liste der Dateien in /public/fonts, und diese Datei macht daraus die
 * Eintraege fuer die Schrift-Auswahl. Zusammengehoerige Schnitte
 * (Regular/Bold/Italic) landen in einem Eintrag.
 *
 * Erkannt werden die ueblichen Schreibweisen:
 *   KodiniSans-Regular.woff2      -> Kodini Sans, 400 normal
 *   KodiniSans-BoldItalic.woff2   -> Kodini Sans, 700 italic
 *   Open_Sans-600.woff2           -> Open Sans, 600 normal
 *   Roboto-VariableFont_wght.ttf  -> Roboto, 100-900
 */

const FONT_EXTENSIONS = ['woff2', 'woff', 'ttf', 'otf'] as const

/** Schnittbezeichnungen -> CSS font-weight. Laengere zuerst pruefen. */
const WEIGHTS: [string, string][] = [
  ['extrablack', '950'],
  ['ultrablack', '950'],
  ['extrabold', '800'],
  ['ultrabold', '800'],
  ['extralight', '200'],
  ['ultralight', '200'],
  ['semibold', '600'],
  ['demibold', '600'],
  ['semilight', '350'],
  ['hairline', '100'],
  ['regular', '400'],
  ['medium', '500'],
  ['normal', '400'],
  ['black', '900'],
  ['heavy', '900'],
  ['light', '300'],
  ['bold', '700'],
  ['book', '400'],
  ['thin', '100'],
]

const STYLES = ['italic', 'oblique']

export interface ParsedFontFile {
  /** Technischer Familienname aus dem Dateinamen, z. B. 'KodiniSans'. */
  familyKey: string
  /** Lesbare Beschriftung, z. B. 'Kodini Sans'. */
  label: string
  weight: string
  style: string
  file: string
}

export function fontExtension(file: string): string | null {
  const ext = file.split('.').pop()?.toLowerCase() ?? ''
  return (FONT_EXTENSIONS as readonly string[]).includes(ext) ? ext : null
}

/** 'KodiniSans' -> 'Kodini Sans', 'Open_Sans' -> 'Open Sans', 'roboto' -> 'Roboto' */
export function prettifyFamily(raw: string): string {
  const spaced = raw
    .replace(/[_.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
  if (!spaced) return raw
  return spaced
    .split(' ')
    .map((w) => (w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ')
}

/**
 * Zerlegt einen Schnitt-Zusatz wie 'BoldItalic' oder '600italic'.
 * @returns null, wenn nichts Bekanntes drinsteht (dann gehoert der Teil zum Namen).
 */
function parseStyleToken(token: string): { weight: string; style: string } | null {
  const t = token.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!t) return null

  let rest = t
  let style = 'normal'
  for (const s of STYLES) {
    if (rest.includes(s)) {
      style = 'italic'
      rest = rest.replace(s, '')
    }
  }

  // Variable Fonts decken den ganzen Bereich ab.
  if (rest.startsWith('variablefont') || rest === 'variable' || rest === 'vf') {
    return { weight: '100 900', style }
  }

  let weight = ''
  const numeric = rest.match(/^([1-9]00|950|1000)$/)
  if (numeric) {
    weight = numeric[1]!
    rest = ''
  } else {
    for (const [name, value] of WEIGHTS) {
      if (rest.startsWith(name)) {
        weight = value
        rest = rest.slice(name.length)
        break
      }
    }
  }

  // Rest muss aufgehen, sonst war es Teil des Namens (z. B. 'Display').
  if (rest !== '') return null
  if (!weight && style === 'normal') return null
  return { weight: weight || '400', style }
}

/** @returns null, wenn die Datei keine erkennbare Schriftdatei ist. */
export function parseFontFileName(file: string): ParsedFontFile | null {
  if (!fontExtension(file)) return null

  const base = file.replace(/\.[^.]+$/, '')
  if (!base) return null

  // Von links nach rechts an jedem - oder _ trennen und pruefen, ob der Rest
  // ein Schnitt ist. Von links, damit mehrteilige Schnitte komplett erfasst
  // werden: 'Roboto-VariableFont_wght' und 'Font-Bold-Italic' gehoeren ganz
  // zum Schnitt, waehrend 'Open_Sans-Bold' nur hinten getrennt wird.
  for (let i = 0; i < base.length; i++) {
    if (base[i] !== '-' && base[i] !== '_') continue
    const family = base.slice(0, i)
    if (!family) continue
    const parsed = parseStyleToken(base.slice(i + 1))
    if (parsed) {
      return {
        familyKey: family,
        label: prettifyFamily(family),
        weight: parsed.weight,
        style: parsed.style,
        file,
      }
    }
  }

  return { familyKey: base, label: prettifyFamily(base), weight: '400', style: 'normal', file }
}

export interface FontFileGroup {
  familyKey: string
  label: string
  files: { file: string; weight: string; style: string }[]
}

/**
 * Gruppiert Dateien nach Familie. Ergebnis ist nach Beschriftung sortiert,
 * damit die Auswahl bei gleichem Ordnerinhalt immer gleich aussieht.
 */
export function groupFontFiles(files: string[]): FontFileGroup[] {
  const groups = new Map<string, FontFileGroup>()

  for (const file of files) {
    const parsed = parseFontFileName(file)
    if (!parsed) continue
    const key = parsed.familyKey.toLowerCase()
    let group = groups.get(key)
    if (!group) {
      group = { familyKey: parsed.familyKey, label: parsed.label, files: [] }
      groups.set(key, group)
    }
    // Gleicher Schnitt zweimal (z. B. .woff2 und .ttf): der erste gewinnt,
    // und das ist dank der Sortierung unten das modernere Format.
    const exists = group.files.some((f) => f.weight === parsed.weight && f.style === parsed.style)
    if (!exists) group.files.push({ file, weight: parsed.weight, style: parsed.style })
  }

  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'))
}

/** woff2 vor woff vor ttf/otf -- bestimmt, welche Datei bei Dubletten gewinnt. */
export function sortByFormatPreference(files: string[]): string[] {
  const rank = (f: string): number => {
    const i = FONT_EXTENSIONS.indexOf((fontExtension(f) ?? '') as (typeof FONT_EXTENSIONS)[number])
    return i === -1 ? FONT_EXTENSIONS.length : i
  }
  return [...files].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}
