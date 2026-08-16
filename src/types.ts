import type { Transform } from '@/utils/textTransforms'
import type { FindOptions } from '@/utils/find'

/** Aktueller Formatzustand der Auswahl im Editor (fuer die Format-Leiste). */
export interface SelectionFormat {
  /** Es ist Text markiert (nicht nur ein Cursor). */
  hasSelection: boolean
  /** Der gesamte Inhalt ist markiert (fuer den Umschalt-Knopf "Alles markieren"). */
  allSelected: boolean
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
  /** Entfernt Fett/Kursiv/Farbe (Auswahl, sonst ganzes Dokument). */
  clearFormatting: () => void
  /** Markiert den gesamten Inhalt. */
  selectAll: () => void
  /** Hebt die Markierung auf. */
  deselect: () => void
  /** Fuegt ein Bild ein (frei platzierbar). Gibt true bei Erfolg zurueck. */
  insertImageFile: (file: File) => Promise<boolean>
}
