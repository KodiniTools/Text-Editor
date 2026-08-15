/**
 * Reine Text-Transformationsfunktionen.
 * Jede Funktion nimmt einen String und gibt einen String zurueck (keine Seiteneffekte).
 * Dadurch einzeln testbar; anwendbar auf Auswahl ODER Gesamttext.
 */

export type Transform = (input: string) => string

const LINE_SEP = '\n'
const splitLines = (s: string): string[] => s.split(/\r?\n/)
const joinLines = (arr: string[]): string => arr.join(LINE_SEP)
const words = (s: string): string[] => s.match(/[\p{L}\p{N}]+/gu) ?? []

/* ---------- Gross-/Kleinschreibung ---------- */

export const toUpperCase: Transform = (s) => s.toUpperCase()
export const toLowerCase: Transform = (s) => s.toLowerCase()

export const toTitleCase: Transform = (s) =>
  s.replace(/\p{L}[\p{L}\p{N}']*/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

export const toSentenceCase: Transform = (s) =>
  s.toLowerCase().replace(/(^\s*\p{L})|([.!?]\s+\p{L})/gu, (m) => m.toUpperCase())

export const toggleCase: Transform = (s) =>
  s.replace(/\p{L}/gu, (c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()))

export const toCamelCase: Transform = (s) => {
  const w = words(s)
  if (w.length === 0) return s
  return w
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join('')
}

export const toSnakeCase: Transform = (s) =>
  words(s)
    .map((w) => w.toLowerCase())
    .join('_')
export const toKebabCase: Transform = (s) =>
  words(s)
    .map((w) => w.toLowerCase())
    .join('-')

/* ---------- Whitespace ---------- */

export const trimText: Transform = (s) => s.trim()
export const trimLines: Transform = (s) => joinLines(splitLines(s).map((l) => l.trim()))
export const removeEmptyLines: Transform = (s) =>
  joinLines(splitLines(s).filter((l) => l.trim() !== ''))
export const collapseSpaces: Transform = (s) => s.replace(/[ \t]{2,}/g, ' ')
export const removeExtraWhitespace: Transform = (s) =>
  joinLines(splitLines(s).map((l) => l.replace(/[ \t]{2,}/g, ' ').trim()))
export const tabsToSpaces =
  (width = 2): Transform =>
  (s) =>
    s.replace(/\t/g, ' '.repeat(width))
export const spacesToTabs =
  (width = 2): Transform =>
  (s) =>
    s.replace(new RegExp(` {${width}}`, 'g'), '\t')

/* ---------- Zeilen-Operationen ---------- */

export const sortLinesAsc: Transform = (s) =>
  joinLines(splitLines(s).sort((a, b) => a.localeCompare(b, 'de')))
export const sortLinesDesc: Transform = (s) =>
  joinLines(splitLines(s).sort((a, b) => b.localeCompare(a, 'de')))
export const sortLinesNumeric: Transform = (s) =>
  joinLines(
    splitLines(s).sort((a, b) => {
      const na = parseFloat(a)
      const nb = parseFloat(b)
      if (Number.isNaN(na) && Number.isNaN(nb)) return a.localeCompare(b, 'de')
      if (Number.isNaN(na)) return 1
      if (Number.isNaN(nb)) return -1
      return na - nb
    }),
  )
export const reverseLines: Transform = (s) => joinLines(splitLines(s).reverse())

export const shuffleLines: Transform = (s) => {
  const arr = splitLines(s)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return joinLines(arr)
}

export const removeDuplicateLines: Transform = (s) => {
  const seen = new Set<string>()
  return joinLines(
    splitLines(s).filter((l) => {
      if (seen.has(l)) return false
      seen.add(l)
      return true
    }),
  )
}

export const numberLines: Transform = (s) => {
  const lines = splitLines(s)
  const width = String(lines.length).length
  return joinLines(lines.map((l, i) => `${String(i + 1).padStart(width, ' ')}. ${l}`))
}

/* ---------- Umkehren ---------- */

export const reverseText: Transform = (s) => Array.from(s).reverse().join('')
export const reverseWords: Transform = (s) => s.split(/(\s+)/).reverse().join('')

/* ---------- Kodierung ---------- */

export const base64Encode: Transform = (s) => {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  bytes.forEach((b) => {
    bin += String.fromCharCode(b)
  })
  return btoa(bin)
}

export const base64Decode: Transform = (s) => {
  try {
    const bin = atob(s.trim())
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return s
  }
}

export const urlEncode: Transform = (s) => encodeURIComponent(s)
export const urlDecode: Transform = (s) => {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
export const htmlEncode: Transform = (s) => s.replace(/[&<>"']/g, (c) => HTML_ENTITIES[c] ?? c)
export const htmlDecode: Transform = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
