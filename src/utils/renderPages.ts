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

/**
 * Hoehe einer Textzeile in px. Im Dokument gilt genau eine Schriftgroesse und
 * eine (einheitenlose) Zeilenhoehe, also ist jede sichtbare Zeile gleich hoch:
 * fontSize * lineHeight.
 */
export function lineStepPx(fontSizePx: number, lineHeight: number): number {
  const step = fontSizePx * lineHeight
  return step > 0 ? step : Math.max(1, fontSizePx)
}

/**
 * Zeilenhoehe fuer die Seiten-Darstellung (Vorschau/PDF) -- auf ganze Pixel
 * gerundet. Vorschau und Export nutzen denselben ganzzahligen Schritt fuer
 * Zeilenhoehe UND Seitenumbruch, damit sich beim Rastern (html2canvas rundet auf
 * ganze Pixel) keine gebrochenen Zeilenhoehen aufsummieren und der Schnitt nie
 * mitten in eine Zeile faellt. Mindestens 1 px.
 */
export function pageLineStepPx(fontSizePx: number, lineHeight: number): number {
  return Math.max(1, Math.round(lineStepPx(fontSizePx, lineHeight)))
}

export interface LinePagination {
  /** Hoehe je Seite, auf ganze Zeilen abgerundet (<= Inhaltshoehe der Seite). */
  pageStepPx: number
  /** Anzahl Seiten. */
  count: number
  /** Ganze Zeilen, die auf eine Seite passen. */
  linesPerPage: number
}

/**
 * Teilt eine Inhaltshoehe in Seiten, ohne eine Zeile zu zerschneiden.
 *
 * Da jede Zeile gleich hoch ist (stepPx), passen pro Seite
 * floor(Seiteninhalt / stepPx) ganze Zeilen. Die Seitenhoehe wird dadurch auf
 * ein Vielfaches der Zeilenhoehe abgerundet; der Rest bleibt unten als
 * Weissraum -- genau wie bei einem echten Seitenumbruch.
 */
export function paginateByLines(
  totalContentPx: number,
  pageContentPx: number,
  stepPx: number,
): LinePagination {
  if (stepPx <= 0 || pageContentPx <= 0) {
    return { pageStepPx: pageContentPx, count: 1, linesPerPage: 1 }
  }
  const linesPerPage = Math.max(1, Math.floor(pageContentPx / stepPx + 1e-4))
  const pageStepPx = linesPerPage * stepPx
  const totalLines = Math.max(1, Math.round(totalContentPx / stepPx))
  const count = Math.max(1, Math.ceil(totalLines / linesPerPage - 1e-4))
  return { pageStepPx, count, linesPerPage }
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

/** Ein frei platziertes Bild in content-relativen px (siehe ImagePlacement). */
export interface PageImage {
  src: string
  x: number
  y: number
  w: number
  h: number
  /** Optionales Link-Ziel -- macht das Bild in Vorschau/Export klickbar. */
  href?: string
}

export interface PageRenderOptions {
  /** Bereinigtes HTML des Dokuments (inkl. Inline-Fett/Kursiv/Farbe). */
  html: string
  widthMm: number
  heightMm: number
  marginMm?: number
  typography: PageTypography
  /** Frei platzierte Bilder (content-relativ, ueber Seiten hinweg). */
  images?: PageImage[]
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
  // Zeilenhoehe bewusst als GANZZAHLIGE px (statt unitless), damit jede Zeile
  // exakt auf demselben Ganzzahl-Raster sitzt: Der PDF-Export rastert die Seiten
  // per html2canvas, das Zeilenpositionen auf ganze Pixel rundet. Bei einer
  // gebrochenen Zeilenhoehe (z. B. 16*1.7 = 27.2 px) sammelt sich diese Rundung
  // ueber viele Zeilen auf, bis der Seitenschnitt mitten in einer Zeile landet --
  // genau die Ursache abgeschnittener Rand-Zeilen. Ganze px verhindern das und
  // halten Vorschau (Bildschirm) und Export deckungsgleich.
  const step = pageLineStepPx(t.fontSizePx, t.lineHeight)
  el.style.lineHeight = `${step}px`
  el.style.letterSpacing = `${t.letterSpacingPx}px`
  el.style.textAlign = t.textAlign
  el.style.color = t.color
  el.style.whiteSpace = t.wrap ? 'pre-wrap' : 'pre'
  el.style.overflowWrap = 'break-word'
  el.style.wordBreak = 'normal'
  // Damit die globalen Ueberschriften-/Listen-Regeln (.editor-rich ...) auch im
  // Export/der Vorschau greifen -- inkl. des Basis-Zeilenschritts fuers Raster.
  el.classList.add('editor-rich')
  el.style.setProperty('--editor-step', `${step}px`)
}

/**
 * Setzt den HTML-Inhalt und entfernt Aussenabstaende der Block-Elemente
 * (Absaetze/Zeilen des Editors). So bleibt jede Zeile gleich hoch -- Bedingung
 * fuer den zeilengenauen Seitenumbruch (paginateByLines) und fuer die
 * Deckungsgleichheit mit dem Editor.
 */
function fillHtml(el: HTMLElement, html: string): void {
  el.innerHTML = html.length > 0 ? html : '<br>'
  el.querySelectorAll<HTMLElement>('div, p').forEach((block) => {
    block.style.margin = '0'
    block.style.padding = '0'
  })
}

/**
 * Erzeugt die Seiten als (zunaechst losgeloestes) DOM. Zum Messen der
 * Inhaltshoehe wird kurz ein unsichtbarer Knoten an <body> gehaengt und wieder
 * entfernt. Der Aufrufer haengt `root` dort ein, wo er es braucht (Vorschau
 * sichtbar, Export ausserhalb des Bildschirms).
 */
/**
 * @param bottomBleedPx Nur fuer den PDF-Export: verlaengert jedes Seitenfenster
 *   um wenige Pixel nach UNTEN. html2canvas zeichnet die Unterlaengen (g, j, p,
 *   ...) der letzten Zeile ein paar Pixel unter die Zeilengrenze; der Zusatz laesst
 *   sie vollstaendig sehen, OHNE die naechste Zeile anzuschneiden (dort steht nur
 *   der leere Durchschuss). Der Inhalt wird NICHT verschoben -- die Zeilenpositionen
 *   bleiben identisch mit Editor/Vorschau. Am Bildschirm (Vorschau) ist das nicht
 *   noetig -> Standard 0.
 */
export function buildPages(opts: PageRenderOptions, bottomBleedPx = 0): RenderedPages {
  const marginMm = opts.marginMm ?? DEFAULT_MARGIN_MM
  const widthPx = Math.round(mmToPx(opts.widthMm))
  const heightPx = Math.round(mmToPx(opts.heightMm))
  const marginPx = Math.round(mmToPx(marginMm))
  const contentW = widthPx - 2 * marginPx
  const contentH = heightPx - 2 * marginPx

  // --- Inhaltshoehe messen ---
  const meter = document.createElement('div')
  meter.style.position = 'absolute'
  meter.style.left = '-99999px'
  meter.style.top = '0'
  meter.style.width = `${contentW}px`
  meter.style.visibility = 'hidden'
  applyTypography(meter, opts.typography)
  fillHtml(meter, opts.html)
  document.body.appendChild(meter)
  const textH = meter.scrollHeight
  document.body.removeChild(meter)

  // Bilder koennen unter den Text reichen -> genug Seiten fuer beides.
  const images = opts.images ?? []
  const imagesBottom = images.reduce((max, img) => Math.max(max, img.y + img.h), 0)
  const totalH = Math.max(textH, imagesBottom)

  // An Zeilengrenzen umbrechen, damit keine Zeile zwischen zwei Seiten
  // zerschnitten wird. Ganzzahliger Schritt (wie die gerenderte Zeilenhoehe),
  // damit Fenster-Hoehe und Versatz ganze Pixel sind und der Umbruch beim Rastern
  // exakt auf einer Zeilengrenze liegt.
  const stepPx = pageLineStepPx(opts.typography.fontSizePx, opts.typography.lineHeight)
  const { pageStepPx, count: n } = paginateByLines(totalH, contentH, stepPx)

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

    // Fenster = Inhaltsbereich (Seite minus Rand). Die Hoehe ist auf ganze
    // Zeilen begrenzt (pageStepPx), damit die unterste Zeile vollstaendig zu
    // sehen ist; der Textblock wird um ganze Seiten nach oben geschoben.
    const windowEl = document.createElement('div')
    windowEl.style.position = 'absolute'
    windowEl.style.left = `${marginPx}px`
    windowEl.style.top = `${marginPx}px`
    // Sicht-Hoehe des Fensters. Zwischenseiten bekommen einen kleinen unteren
    // Zuschlag (Unterlaengen der letzten Zeile, siehe bottomBleedPx); die letzte
    // Seite nicht (dort folgt nichts mehr).
    const windowH = Math.min(contentH, pageStepPx)
    const bleed = i < n - 1 ? bottomBleedPx : 0
    windowEl.style.width = `${contentW}px`
    windowEl.style.height = `${windowH + bleed}px`
    windowEl.style.overflow = 'hidden'

    const inner = document.createElement('div')
    inner.style.width = `${contentW}px`
    inner.style.marginTop = `${-i * pageStepPx}px`
    applyTypography(inner, opts.typography)
    fillHtml(inner, opts.html)

    windowEl.appendChild(inner)

    // Bilder dieser Seite (content-relativ; gleicher Versatz wie der Text). Nur
    // die, die das Fenster dieser Seite schneiden. Ueberstehende werden vom
    // Fenster (overflow: hidden) beschnitten -- wie ein Bild am Seitenrand.
    const pageTop = i * pageStepPx
    for (const img of images) {
      if (img.y + img.h <= pageTop || img.y >= pageTop + windowH) continue
      const el = document.createElement('img')
      el.src = img.src
      el.draggable = false
      el.style.width = `${img.w}px`
      el.style.height = `${img.h}px`
      el.style.objectFit = 'fill'
      el.style.display = 'block'
      // Positioniert wird der Rahmen (Bild oder umschliessender Link).
      const frame = img.href ? document.createElement('a') : el
      if (img.href) {
        const a = frame as HTMLAnchorElement
        a.href = img.href
        a.target = '_blank'
        a.rel = 'noopener noreferrer nofollow'
        a.appendChild(el)
      }
      frame.style.position = 'absolute'
      frame.style.left = `${img.x}px`
      frame.style.top = `${img.y - pageTop}px`
      frame.style.width = `${img.w}px`
      frame.style.height = `${img.h}px`
      windowEl.appendChild(frame)
    }

    page.appendChild(windowEl)
    root.appendChild(page)
    pages.push(page)
  }

  return { root, pages, widthPx, heightPx }
}
