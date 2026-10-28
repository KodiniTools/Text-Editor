/**
 * Teilen ueber die Web Share API (navigator.share). Reine Helfer ohne
 * Store-/Komponentenbezug -- dadurch testbar. Die Entscheidung, was bei
 * fehlender Unterstuetzung passiert (Download-Fallback, Hinweis), trifft der
 * Aufrufer anhand des Ergebnisses.
 *
 * Unterstuetzung (Stand 2026): Dateien teilen koennen Chrome/Edge (Desktop +
 * Android), Safari (macOS/iOS) und Samsung Internet; Firefox hat kein
 * navigator.share auf dem Desktop. Ausserdem nur im sicheren Kontext (https)
 * und nur als Folge einer Nutzeraktion (Klick).
 */

/** Ergebnis eines Teilen-Versuchs. */
export type ShareOutcome =
  /** Vom System-Dialog uebernommen (Ziel-App hat die Daten). */
  | 'shared'
  /** Nutzer hat den Dialog abgebrochen -- kein Fehler, kein Fallback noetig. */
  | 'cancelled'
  /** Kein navigator.share oder Dateien dieses Typs nicht teilbar. */
  | 'unsupported'
  /** share() hat einen anderen Fehler geworfen (z. B. fehlende Nutzergeste). */
  | 'failed'

/** Minimaler Ausschnitt von `navigator`, den wir brauchen (fuer Tests ersetzbar). */
export type ShareNavigator = Pick<Navigator, 'share' | 'canShare'>

/** Baut aus Text eine Datei fuer den Share-Dialog (Name inkl. Endung, MIME-Typ). */
export function textToFile(content: string, fileName: string, type: string): File {
  return new File([content], fileName, { type })
}

/** Baut aus einem Blob (z. B. PDF) eine Datei fuer den Share-Dialog. */
export function blobToFile(blob: Blob, fileName: string, type = blob.type): File {
  return new File([blob], fileName, { type })
}

/** Gibt es ueberhaupt eine Teilen-Funktion? */
export function canShare(nav: ShareNavigator | undefined = globalThis.navigator): boolean {
  return typeof nav?.share === 'function'
}

/**
 * Lassen sich diese Dateien teilen? Ohne `canShare` (aeltere Implementierungen)
 * bleibt nur der Versuch -- dann optimistisch `true`, share() entscheidet.
 */
export function canShareFiles(
  files: File[],
  nav: ShareNavigator | undefined = globalThis.navigator,
): boolean {
  if (!canShare(nav) || files.length === 0) return false
  if (typeof nav?.canShare !== 'function') return true
  try {
    return nav.canShare({ files })
  } catch {
    return false
  }
}

/** Ordnet einen share()-Fehler einem Ergebnis zu. */
function outcomeFromError(err: unknown): ShareOutcome {
  const name = err instanceof Error ? err.name : ''
  if (name === 'AbortError') return 'cancelled'
  // Chrome meldet nicht teilbare Dateitypen als TypeError / NotAllowedError.
  if (name === 'TypeError' || name === 'NotSupportedError') return 'unsupported'
  return 'failed'
}

/**
 * Teilt eine Datei ueber den System-Dialog. Prueft vorher per canShare, ob
 * Dateien dieses Typs unterstuetzt werden, damit der Aufrufer sauber auf den
 * Download zurueckfallen kann.
 */
export async function shareFile(
  file: File,
  title: string,
  nav: ShareNavigator | undefined = globalThis.navigator,
): Promise<ShareOutcome> {
  if (!canShareFiles([file], nav)) return 'unsupported'
  try {
    await nav!.share({ files: [file], title })
    return 'shared'
  } catch (err) {
    return outcomeFromError(err)
  }
}

/**
 * Teilt reinen Text (ohne Datei) -- Fallback fuer Browser, die share() koennen,
 * aber keine Dateien (z. B. aeltere Safari-Versionen).
 */
export async function shareText(
  text: string,
  title: string,
  nav: ShareNavigator | undefined = globalThis.navigator,
): Promise<ShareOutcome> {
  if (!canShare(nav)) return 'unsupported'
  try {
    await nav!.share({ text, title })
    return 'shared'
  } catch (err) {
    return outcomeFromError(err)
  }
}
