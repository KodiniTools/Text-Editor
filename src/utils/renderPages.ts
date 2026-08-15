/**
 * Baut die Seiten-Darstellung eines Dokuments als DOM -- genau so, wie sie
 * spaeter exportiert wird. Vorschau und PDF verwenden dieselbe Funktion, damit
 * die Vorschau die exportierte Datei exakt abbildet (gleicher Umbruch, gleiche
 * Schrift). Der PDF-Export rastert diese DOM-Seiten (html2canvas), sodass jede
 * Schrift pixelgenau uebernommen wird, ohne dass sie einzeln eingebettet werden
 * muss.
 */

/** Umrechnung mm -> px bei 96 dpi (CSS-Referenzaufloesung). */
export const PX_PER_MM = 96 / 25.4

/** Seitenrand des Dokuments in mm (passt zur @page-Regel des Ausdrucks). */
export const DEFAULT_MARGIN_MM = 18

export function mmToPx(mm: number): number {
  return mm * PX_PER_MM
}

/** Anzahl Seiten fuer eine Inhaltshoehe. Mindestens 1 (auch bei leerem Text). */
export function pageCount(totalContentPx: number, pageContentPx: number): number {
  if (pageContentPx <= 0 || totalContentPx <= 0) return 1
  // Kleine Toleranz gegen Rundungsfehler beim Messen.
  return Math.max(1, Math.ceil(totalContentPx / pageContentPx - 1e-4))
}

export interface PageTypography {
  fontStack: string
  fontWeight: string
  fontStyle: string
  fontSizePx: number
  lineHeight: number
  letterSpacingPx: number
  textAlign: string
  color: string
  wrap: boolean
}

export interface PageRenderOptions {
  content: string
  widthMm: number
  heightMm: number
  marginMm?: number
  typography: PageTypography
}

export interface RenderedPages {
  /** Container mit allen Seiten (senkrecht gestapelt). */
  root: HTMLElement
  /** Die einzelnen Seiten-Elemente (fuer den seitenweisen PDF-Export). */
  pages: HTMLElement[]
  widthPx: number
  heightPx: number
}

function applyTypography(el: HTMLElement, t: PageTypography): void {
  el.style.fontFamily = t.fontStack
  el.style.fontWeight = t.fontWeight
  el.style.fontStyle = t.fontStyle
  el.style.fontSize = `${t.fontSizePx}px`
  el.style.lineHeight = String(t.lineHeight)
  el.style.letterSpacing = `${t.letterSpacingPx}px`
  el.style.textAlign = t.textAlign
  el.style.color = t.color
  el.style.whiteSpace = t.wrap ? 'pre-wrap' : 'pre'
  el.style.overflowWrap = 'break-word'
  el.style.wordBreak = 'normal'
}

/**
 * Erzeugt die Seiten als (zunaechst losgeloestes) DOM. Zum Messen der
 * Inhaltshoehe wird kurz ein unsichtbarer Knoten an <body> gehaengt und wieder
 * entfernt. Der Aufrufer haengt `root` dort ein, wo er es braucht (Vorschau
 * sichtbar, Export ausserhalb des Bildschirms).
 */
export function buildPages(opts: PageRenderOptions): RenderedPages {
  const marginMm = opts.marginMm ?? DEFAULT_MARGIN_MM
  const widthPx = Math.round(mmToPx(opts.widthMm))
  const heightPx = Math.round(mmToPx(opts.heightMm))
  const marginPx = Math.round(mmToPx(marginMm))
  const contentW = widthPx - 2 * marginPx
  const contentH = heightPx - 2 * marginPx

  // Leerer Text bekommt trotzdem eine Zeile, damit eine Seite entsteht.
  const text = opts.content.length > 0 ? opts.content : ' '

  // --- Inhaltshoehe messen ---
  const meter = document.createElement('div')
  meter.style.position = 'absolute'
  meter.style.left = '-99999px'
  meter.style.top = '0'
  meter.style.width = `${contentW}px`
  meter.style.visibility = 'hidden'
  applyTypography(meter, opts.typography)
  meter.textContent = text
  document.body.appendChild(meter)
  const totalH = meter.scrollHeight
  document.body.removeChild(meter)

  const n = pageCount(totalH, contentH)

  // --- Seiten bauen ---
  const root = document.createElement('div')
  root.style.display = 'flex'
  root.style.flexDirection = 'column'
  root.style.alignItems = 'center'
  root.style.gap = '16px'

  const pages: HTMLElement[] = []
  for (let i = 0; i < n; i++) {
    const page = document.createElement('div')
    page.className = 'kodini-pdf-page'
    page.style.position = 'relative'
    page.style.boxSizing = 'border-box'
    page.style.width = `${widthPx}px`
    page.style.height = `${heightPx}px`
    page.style.background = '#ffffff'
    page.style.overflow = 'hidden'
    page.style.flex = '0 0 auto'

    // Fenster = Inhaltsbereich (Seite minus Rand); zeigt den Ausschnitt der
    // Seite i durch einen negativen Versatz des Textblocks.
    const windowEl = document.createElement('div')
    windowEl.style.position = 'absolute'
    windowEl.style.left = `${marginPx}px`
    windowEl.style.top = `${marginPx}px`
    windowEl.style.width = `${contentW}px`
    windowEl.style.height = `${contentH}px`
    windowEl.style.overflow = 'hidden'

    const inner = document.createElement('div')
    inner.style.width = `${contentW}px`
    inner.style.marginTop = `${-i * contentH}px`
    applyTypography(inner, opts.typography)
    inner.textContent = text

    windowEl.appendChild(inner)
    page.appendChild(windowEl)
    root.appendChild(page)
    pages.push(page)
  }

  return { root, pages, widthPx, heightPx }
}
