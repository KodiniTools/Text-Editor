import type { Transform } from '@/utils/textTransforms'
import type { FindOptions } from '@/utils/find'

/** Aktueller Formatzustand der Auswahl im Editor (fuer die Format-Leiste). */
export interface SelectionFormat {
  /** Es ist Text markiert (nicht nur ein Cursor). */
  hasSelection: boolean
  bold: boolean
  italic: boolean
  /** Farbe an der Cursor-/Auswahlposition als Hex ('' = keine eigene Farbe). */
  color: string
}

/** Oeffentliche Methoden der EditorArea-Komponente (via defineExpose). */
export interface EditorApi {
  focusEditor: () => void
  applyTransform: (fn: Transform) => void
  insertText: (text: string) => void
  findNext: (query: string, opts: FindOptions) => boolean
  findPrev: (query: string, opts: FindOptions) => boolean
  replaceCurrent: (query: string, replacement: string, opts: FindOptions) => boolean
  replaceAll: (query: string, replacement: string, opts: FindOptions) => number
  countMatches: (query: string, opts: FindOptions) => number
  /** Inline-Formatierung der Auswahl (Stufe 1: Fett/Kursiv/Farbe). */
  toggleBold: () => void
  toggleItalic: () => void
  applyColor: (color: string) => void
}
