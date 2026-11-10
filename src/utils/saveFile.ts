/**
 * Speichern mit Zielwahl: nutzt die File System Access API
 * (`window.showSaveFilePicker`), wenn der Browser sie anbietet, und faellt sonst
 * auf den klassischen Download (downloadBlob) zurueck. Reine Helfer ohne
 * Store-/Komponentenbezug -- dadurch testbar.
 *
 * Unterstuetzung (Stand 2026): Chrome/Edge/Opera auf dem Desktop; Firefox und
 * Safari haben kein showSaveFilePicker -- dort entscheidet der Browser ueber
 * den Speicherort (Download-Ordner bzw. eigener Dialog je nach Einstellung).
 * Nur im sicheren Kontext (https/localhost) und als Folge einer Nutzergeste.
 */

import { downloadBlob } from './files'

/** Dateiendungen, in denen der Editor exportiert. */
export type SaveExt = 'txt' | 'md' | 'html' | 'pdf' | 'json'

/* Minimaler Ausschnitt der File System Access API (nicht in lib.dom enthalten). */
interface WritableLike {
  write(data: Blob | string): Promise<void>
  close(): Promise<void>
}
export interface SaveFileHandle {
  createWritable(): Promise<WritableLike>
}
interface SavePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}
export interface SavePickerWindow {
  showSaveFilePicker?: (opts: SavePickerOptions) => Promise<SaveFileHandle>
  isSecureContext?: boolean
}

/** Ziel eines Speichervorgangs: Dateiname plus (bei Zielwahl) das Datei-Handle. */
export interface SaveTarget {
  fileName: string
  /** null -> klassischer Download in den Browser-Download-Ordner. */
  handle: SaveFileHandle | null
}

/** Bietet der Browser eine Speicherort-Auswahl an? */
export function supportsSavePicker(
  win: SavePickerWindow | undefined = globalThis.window as SavePickerWindow | undefined,
): boolean {
  return typeof win?.showSaveFilePicker === 'function' && win.isSecureContext !== false
}

/** MIME-Typ ohne Parameter (`text/plain;charset=utf-8` -> `text/plain`). */
export function baseMime(type: string): string {
  return type.split(';')[0]!.trim()
}

/**
 * Trennt einen Dateinamen in Rumpf und Endung, wenn die Endung mit der
 * erwarteten uebereinstimmt (`notiz.TXT` + txt -> `notiz`). Andere Punkte im
 * Namen bleiben erhalten (`v1.2` -> `v1.2`).
 */
export function stripExt(name: string, ext: SaveExt): string {
  const re = new RegExp(`\\.${ext}$`, 'i')
  return name.trim().replace(re, '')
}

/**
 * Oeffnet den System-Dialog zur Zielwahl. Liefert das Ziel, `'cancelled'` bei
 * Abbruch durch den Nutzer und `'unsupported'` ohne API. Muss direkt aus einer
 * Nutzergeste (Klick) aufgerufen werden -- deshalb VOR langen Arbeiten wie dem
 * PDF-Rendern.
 */
export async function pickSaveTarget(
  fileName: string,
  type: string,
  ext: SaveExt,
  win: SavePickerWindow | undefined = globalThis.window as SavePickerWindow | undefined,
): Promise<SaveTarget | 'cancelled' | 'unsupported'> {
  if (!supportsSavePicker(win)) return 'unsupported'
  try {
    const handle = await win!.showSaveFilePicker!({
      suggestedName: fileName,
      types: [{ accept: { [baseMime(type)]: [`.${ext}`] } }],
    })
    return { fileName, handle }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return 'cancelled'
    // z. B. SecurityError (keine Nutzergeste, Iframe) -> wie "nicht unterstuetzt"
    return 'unsupported'
  }
}

/**
 * Schreibt den Inhalt an das Ziel: in die gewaehlte Datei oder -- ohne Handle --
 * als Download. Fehler beim Schreiben werden weitergereicht.
 */
export async function writeSaveTarget(
  target: SaveTarget,
  content: BlobPart,
  type: string,
): Promise<'written' | 'downloaded'> {
  if (!target.handle) {
    downloadBlob(content, target.fileName, type)
    return 'downloaded'
  }
  const writable = await target.handle.createWritable()
  try {
    await writable.write(new Blob([content], { type }))
  } finally {
    await writable.close()
  }
  return 'written'
}
