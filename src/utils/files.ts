/**
 * Kleine Datei-Helfer fuer Import (oeffnen, Drag & Drop) und Download.
 * Bewusst ohne Framework-Bezug -- dadurch testbar und ueberall nutzbar.
 */

/** Liest eine Datei als Text (UTF-8). */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('read-error'))
    reader.readAsText(file)
  })
}

/** `.json`-Sicherung? (nach Endung oder MIME-Typ). */
export function isBackupFile(file: File): boolean {
  return /\.json$/i.test(file.name) || file.type === 'application/json'
}

/** Als Text oeffenbare Datei? (Text-MIME oder bekannte Endung). */
export function isTextFile(file: File): boolean {
  return file.type.startsWith('text/') || /\.(txt|md|markdown|csv|log|tsv|text)$/i.test(file.name)
}

/** Bilddatei? */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/** Loest einen Datei-Download im Browser aus (Blob -> temporaerer Link). */
export function downloadBlob(content: BlobPart, fileName: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
