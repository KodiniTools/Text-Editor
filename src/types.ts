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
  /** Erweiterte Auszeichnung der Auswahl. */
  underline: boolean
  strikethrough: boolean
  /** Auswahl ist hervorgehoben (<mark>). */
  highlight: boolean
  /** Cursor/Auswahl liegt in einem Link (<a>). */
  link: boolean
  /** Ziel-URL des Links an der Cursorposition ('' = kein Link). */
  linkHref: string
  /** Farbe an der Cursor-/Auswahlposition als Hex ('' = keine eigene Farbe). */
  color: string
  /** Blocktyp der aktuellen Zeile (Normal/Ueberschrift). */
  block: BlockType
  /** Aktuelle Zeile(n) stehen in einem Zitat (<blockquote>). */
  quote: boolean
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
  /** Fuegt bereinigtes HTML an der Cursorposition ein (formatiertes Einfuegen). */
  insertHtml: (html: string) => void
  findNext: (query: string, opts: FindOptions) => boolean
  findPrev: (query: string, opts: FindOptions) => boolean
  replaceCurrent: (query: string, replacement: string, opts: FindOptions) => boolean
  replaceAll: (query: string, replacement: string, opts: FindOptions) => number
  countMatches: (query: string, opts: FindOptions) => number
  /** Inline-Formatierung der Auswahl (Stufe 1: Fett/Kursiv/Farbe). */
  toggleBold: () => void
  toggleItalic: () => void
  applyColor: (color: string) => void
  /** Erweiterte Auszeichnung der Auswahl (Unterstrichen/Durchgestrichen/Highlight). */
  toggleUnderline: () => void
  toggleStrikethrough: () => void
  toggleHighlight: () => void
  /** Link auf die Auswahl setzen bzw. aktualisieren. */
  createLink: (url: string) => void
  /** Link an der Cursorposition entfernen. */
  removeLink: () => void
  /** Zitat (blockquote) fuer die aktuelle Zeile(n) an/aus. */
  toggleQuote: () => void
  /** Entfernt Fett/Kursiv/Farbe und die erweiterte Auszeichnung. */
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
