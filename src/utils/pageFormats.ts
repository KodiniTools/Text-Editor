/**
 * Gaengige Papierformate fuer die Seiten-Ansicht und den PDF-/Druck-Export.
 *
 * Masse in Millimetern, jeweils im Hochformat (Breite < Hoehe). Fuer Querformat
 * werden Breite und Hoehe getauscht.
 */

export type PageOrientation = 'portrait' | 'landscape'
export type PageFormatId = 'none' | 'a3' | 'a4' | 'a5' | 'letter' | 'legal'

export interface PageFormat {
  id: Exclude<PageFormatId, 'none'>
  label: string
  /** Breite im Hochformat (mm). */
  widthMm: number
  /** Hoehe im Hochformat (mm). */
  heightMm: number
}

export const PAGE_FORMATS: PageFormat[] = [
  { id: 'a3', label: 'A3', widthMm: 297, heightMm: 420 },
  { id: 'a4', label: 'A4', widthMm: 210, heightMm: 297 },
  { id: 'a5', label: 'A5', widthMm: 148, heightMm: 210 },
  { id: 'letter', label: 'Letter', widthMm: 216, heightMm: 279 },
  { id: 'legal', label: 'Legal', widthMm: 216, heightMm: 356 },
]

export const PAGE_FORMAT_IDS: PageFormatId[] = ['none', ...PAGE_FORMATS.map((f) => f.id)]

export function isPageFormatId(value: unknown): value is PageFormatId {
  return typeof value === 'string' && (PAGE_FORMAT_IDS as string[]).includes(value)
}

export function isOrientation(value: unknown): value is PageOrientation {
  return value === 'portrait' || value === 'landscape'
}

export function findPageFormat(id: PageFormatId): PageFormat | null {
  return PAGE_FORMATS.find((f) => f.id === id) ?? null
}

/**
 * Masse (mm) fuer Format + Ausrichtung. Bei Querformat sind Breite/Hoehe
 * getauscht. `null`, wenn kein Format gewaehlt ist ('none').
 */
export function pageDimensions(
  id: PageFormatId,
  orientation: PageOrientation,
): { widthMm: number; heightMm: number } | null {
  const fmt = findPageFormat(id)
  if (!fmt) return null
  return orientation === 'landscape'
    ? { widthMm: fmt.heightMm, heightMm: fmt.widthMm }
    : { widthMm: fmt.widthMm, heightMm: fmt.heightMm }
}

/** Seitenverhaeltnis (Breite/Hoehe) fuer die Bildschirm-Darstellung. */
export function pageAspect(id: PageFormatId, orientation: PageOrientation): number | null {
  const dims = pageDimensions(id, orientation)
  return dims ? dims.widthMm / dims.heightMm : null
}

/**
 * CSS-Wert fuer die `@page { size: ... }`-Regel des Ausdrucks.
 * Explizite mm-Masse statt Schluesselwoertern -- so stimmt auch das Querformat
 * zuverlaessig. Ohne Format (oder Fallback) A4 Hochformat.
 */
export function pageSizeCss(id: PageFormatId, orientation: PageOrientation): string {
  const dims = pageDimensions(id, orientation) ?? { widthMm: 210, heightMm: 297 }
  return `${dims.widthMm}mm ${dims.heightMm}mm`
}
