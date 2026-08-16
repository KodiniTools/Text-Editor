import type { Transform } from '@/utils/textTransforms'
import type { FindOptions } from '@/utils/find'

/** Absatz-/Blocktyp an der Cursorposition. */
export type BlockType = 'p' | 'h1' | 'h2' | 'h3'

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
  /** Blocktyp der aktuellen Zeile (Normal/Ueberschrift). */
  block: BlockType
  /** Cursor steht in einer Aufzaehlungsliste. */
  bulletList: boolean
  /** Cursor steht in einer nummerierten Liste. */
  numberedList: boolean
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
  /** Setzt den Blocktyp der aktuellen Zeile(n) (Normal/Ueberschrift). */
  setBlock: (block: BlockType) => void
  /** Aufzaehlungsliste an/aus. */
  toggleBulletList: () => void
  /** Nummerierte Liste an/aus. */
  toggleNumberedList: () => void
  /** Markiert den gesamten Inhalt. */
  selectAll: () => void
  /** Hebt die Markierung auf. */
  deselect: () => void
  /** Fuegt ein Bild ein (frei platzierbar). Gibt true bei Erfolg zurueck. */
  insertImageFile: (file: File) => Promise<boolean>
}
