/**
 * Ein-Klick-PDF-Export. Rastert die vom Editor erzeugten Seiten (buildPages)
 * seitenweise per html2canvas und legt sie als jsPDF-Seiten ab. Die gewaehlte
 * Schrift wird dabei pixelgenau uebernommen -- unabhaengig davon, wie viele
 * eigene Schriften installiert sind.
 */

import { buildPages, type PageRenderOptions } from './renderPages'

export interface PdfExportOptions extends PageRenderOptions {
  /** Dateiname ohne Endung. */
  fileName: string
  /** Aufloesungsfaktor fuer die Rasterung (2 = ~192 dpi). */
  scale?: number
}

/** Bereinigt einen Dokumentnamen zu einem sicheren Dateinamen. */
export function safeFileName(name: string): string {
  const clean = name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 120)
  return clean || 'dokument'
}

/**
 * Baut die Seiten (unsichtbar), rastert sie und speichert das PDF.
 * Gibt die Anzahl der erzeugten Seiten zurueck.
 */
export async function exportPdf(opts: PdfExportOptions): Promise<number> {
  // jsPDF und html2canvas sind gross und werden nur beim Export gebraucht --
  // deshalb erst hier dynamisch laden (eigener Chunk, nicht im Startbundle).
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ])

  const { root, pages, widthPx, heightPx } = buildPages(opts)

  // Ausserhalb des sichtbaren Bereichs einhaengen, sonst rendert html2canvas
  // nichts. Volle Groesse (kein Herunterskalieren) -> maximale Schaerfe.
  root.style.position = 'fixed'
  root.style.left = '-100000px'
  root.style.top = '0'
  root.style.gap = '0'
  document.body.appendChild(root)

  try {
    const scale = opts.scale ?? 2
    const pdf = new jsPDF({
      orientation: opts.widthMm > opts.heightMm ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [opts.widthMm, opts.heightMm],
      compress: true,
    })

    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i]!, {
        scale,
        backgroundColor: '#ffffff',
        width: widthPx,
        height: heightPx,
        windowWidth: widthPx,
        windowHeight: heightPx,
        useCORS: true,
        logging: false,
      })
      // PNG haelt Textkanten scharf (JPEG wuerde sie verwaschen).
      const img = canvas.toDataURL('image/png')
      if (i > 0) {
        pdf.addPage(
          [opts.widthMm, opts.heightMm],
          opts.widthMm > opts.heightMm ? 'landscape' : 'portrait',
        )
      }
      pdf.addImage(img, 'PNG', 0, 0, opts.widthMm, opts.heightMm)
    }

    pdf.save(`${safeFileName(opts.fileName)}.pdf`)
    return pages.length
  } finally {
    document.body.removeChild(root)
  }
}
