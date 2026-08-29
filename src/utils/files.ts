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

/** HTML-Datei? (nach MIME-Typ oder Endung). */
export function isHtmlFile(file: File): boolean {
  return (
    file.type === 'text/html' ||
    file.type === 'application/xhtml+xml' ||
    /\.(html?|xhtml)$/i.test(file.name)
  )
}

/**
 * Als reiner Text oeffenbare Datei? (Text-MIME oder bekannte Endung).
 * HTML ist bewusst ausgenommen -- es wird ueber den eigenen HTML-Pfad geoeffnet
 * (Rumpf extrahieren + bereinigen), nicht als maskierter Quelltext.
 */
export function isTextFile(file: File): boolean {
  if (isHtmlFile(file)) return false
  return file.type.startsWith('text/') || /\.(txt|md|markdown|csv|log|tsv|text)$/i.test(file.name)
}

/** Bilddatei? */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/**
 * Sucht in einem DataTransfer (Paste-Event oder Drag&Drop) das erste Bild.
 * Deckt beide Faelle ab: eine aus dem Datei-Manager kopierte/gezogene Bilddatei
 * (ueber `files`) und ein aus einer App kopiertes Bitmap wie "Bild kopieren"
 * (ueber `items` mit kind === 'file'). Liefert null, wenn kein Bild dabei ist.
 *
 * Hinweis: Die asynchrone Zwischenablage-API (`navigator.clipboard.read`) sieht
 * aus dem Datei-Explorer kopierte Dateien NICHT -- solche Bilder kommen nur ueber
 * das Paste-Event (Strg+V) oder Drag&Drop hier an.
 */
export function imageFileFromDataTransfer(dt: DataTransfer | null): File | null {
  if (!dt) return null
  for (const file of Array.from(dt.files)) {
    if (isImageFile(file)) return file
  }
  for (const item of Array.from(dt.items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  return null
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
