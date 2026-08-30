/**
 * Ein-Klick-PDF-Export. Rastert die vom Editor erzeugten Seiten (buildPages)
 * seitenweise per html2canvas und legt sie als jsPDF-Seiten ab. Die gewaehlte
 * Schrift wird dabei pixelgenau uebernommen -- unabhaengig davon, wie viele
 * eigene Schriften installiert sind.
 */

import {
  buildPages,
  DEFAULT_MARGIN_MM,
  mmToPx,
  pageLineStepPx,
  type PageRenderOptions,
} from './renderPages'

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

  // html2canvas zeichnet die Unterlaengen (g, j, p, ...) der letzten Zeile ein
  // paar Pixel unter die Zeilengrenze. Ohne Gegenmassnahme entstehen dadurch am
  // Seitenschnitt zwei Artefakte: unten leicht abgeschnittene Unterlaengen und
  // oben ein schmales Leck derselben Zeile. Beide werden OHNE Inhaltsverschiebung
  // behoben, sodass die Zeilenpositionen exakt mit Editor/Vorschau/HTML
  // uebereinstimmen:
  //  - Unterer Zuschlag (bleed): das Fenster jeder Zwischenseite zeigt die
  //    Unterlaengen vollstaendig, ohne die naechste Zeile anzuschneiden.
  //  - Weisse Blende (mask): der Kopf-Durchschuss der Folgeseite wird NACH dem
  //    Rastern uebermalt (zuverlaessiger als ein DOM-Overlay, das html2canvas
  //    beim Stapeln ignoriert).
  const step = pageLineStepPx(opts.typography.fontSizePx, opts.typography.lineHeight)
  const leadingHalf = Math.max(0, Math.floor((step - opts.typography.fontSizePx) / 2))
  const bleedPx = Math.min(5, leadingHalf)
  const maskPx = Math.min(5, leadingHalf)

  const { root, pages, widthPx, heightPx } = buildPages(opts, bleedPx)
  const marginMm = opts.marginMm ?? DEFAULT_MARGIN_MM
  const marginPx = Math.round(mmToPx(marginMm))
  const contentW = widthPx - 2 * marginPx

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
      const raster = await html2canvas(pages[i]!, {
        scale,
        backgroundColor: '#ffffff',
        width: widthPx,
        height: heightPx,
        windowWidth: widthPx,
        windowHeight: heightPx,
        useCORS: true,
        logging: false,
      })
      // Ab Seite 2 das Rasterleck der Vorseite (Unterlaengen im Kopf-Durchschuss)
      // uebermalen. Bewusst ueber eine EIGENE Canvas: ein direkt auf die
      // html2canvas-Canvas gemaltes Rechteck taucht in deren toDataURL nicht auf.
      let img: string
      if (i > 0 && maskPx > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = raster.width
        canvas.height = raster.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(raster, 0, 0)
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(marginPx * scale, marginPx * scale, contentW * scale, maskPx * scale)
          img = canvas.toDataURL('image/png')
        } else {
          img = raster.toDataURL('image/png')
        }
      } else {
        // PNG haelt Textkanten scharf (JPEG wuerde sie verwaschen).
        img = raster.toDataURL('image/png')
      }
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
