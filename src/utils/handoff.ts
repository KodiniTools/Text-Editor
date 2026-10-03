/**
 * Uebernahme von Textdateien aus anderen KodiniTools (z. B. dem Playlist
 * Generator). Das sendende Tool legt die Datei unter HANDOFF_STORAGE_KEY im
 * localStorage ab (gleiche Domain kodinitools.com) und oeffnet den Editor unter
 * `/app?source=<tool>`. Der Editor liest den Eintrag beim Start genau einmal,
 * entfernt ihn und oeffnet den Inhalt als neues Dokument.
 *
 * Eintrag (JSON): { version: 1, source: string, name: string, content: string,
 *                   mimeType?: string, sharedAt: number }
 *
 * Gegenstueck im Playlist Generator: src/utils/textEditorHandoff.ts
 */
import { htmlFileToSource, isHtmlContent } from './richText'

export const HANDOFF_STORAGE_KEY = 'kodinitools-texteditor-handoff-v1'
export const HANDOFF_VERSION = 1
/** Aeltere Eintraege gelten als verwaist (Tab nie geladen) und werden verworfen. */
export const HANDOFF_MAX_AGE_MS = 60 * 60 * 1000

export interface HandoffDocument {
  source: string
  name: string
  content: string
  mimeType?: string
  sharedAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHandoffDocument(value: unknown, now: number): value is HandoffDocument {
  if (!isRecord(value)) return false
  if (value.version !== HANDOFF_VERSION) return false
  if (typeof value.source !== 'string' || typeof value.name !== 'string') return false
  if (typeof value.content !== 'string') return false
  if (typeof value.sharedAt !== 'number' || !Number.isFinite(value.sharedAt)) return false
  if (value.mimeType !== undefined && typeof value.mimeType !== 'string') return false
  return now - value.sharedAt <= HANDOFF_MAX_AGE_MS
}

/**
 * Liest den abgelegten Eintrag und entfernt ihn immer -- auch wenn er ungueltig
 * oder veraltet ist, damit er nicht bei jedem Start erneut auftaucht.
 * Liefert null, wenn nichts (Gueltiges) vorliegt oder localStorage blockiert ist.
 */
export function readHandoff(now: number = Date.now()): HandoffDocument | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(HANDOFF_STORAGE_KEY)
    if (raw !== null) localStorage.removeItem(HANDOFF_STORAGE_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isHandoffDocument(parsed, now) ? parsed : null
  } catch {
    return null
  }
}

/** Dokumentname ohne Dateiendung -- wie beim Oeffnen per Drag & Drop. */
export function handoffDocumentName(doc: HandoffDocument): string {
  return doc.name.replace(/\.[^.]+$/, '').trim()
}

/**
 * Inhalt fuer den Editor: Dateien mit Markup (z. B. XSPF-XML) werden als
 * Quelltext uebernommen, damit ihre Tags sichtbar bleiben; reiner Text 1:1.
 */
export function handoffContent(doc: HandoffDocument): string {
  return isHtmlContent(doc.content) ? htmlFileToSource(doc.content) : doc.content
}
