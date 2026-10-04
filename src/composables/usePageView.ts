import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { LIMITS, useEditorStore } from '@/stores/editor'
import { pageDimensions } from '@/utils/pageFormats'
import { DEFAULT_MARGIN_MM, mmToPx, pageLineStepPx, paginateByLines } from '@/utils/renderPages'

/** Innen-Abstand der Seiten-Leinwand (.page-backdrop) je Seite in px (1rem). */
const BACKDROP_PAD = 16

/** Kennzahlen der aktuellen Seite (in px), abgeleitet vom Papierformat. */
export interface PageMetrics {
  pageW: number
  pageH: number
  margin: number
  contentW: number
  contentH: number
}

/**
 * Seiten-Ansicht (A4/A3/...) fuer den Editor: leitet aus dem gewaehlten
 * Papierformat die Kennzahlen (Blattgroesse, Rand, Inhaltsflaeche), die Styles
 * fuer Blatt/Leinwand und die Seitenumbruch-Fuehrungslinien ab. Miss die
 * Inhaltshoehe des Editors (`measure`), damit das Blatt bei langen Texten
 * mitwaechst und der zeilengenaue Umbruch stimmt.
 *
 * @param editable Referenz auf das contenteditable-Feld (Hoehenmessung).
 */
export function usePageView(editable: Ref<HTMLElement | null>) {
  const store = useEditorStore()

  /** Scroll-Container der Seiten-Ansicht (fuer Bild-Platzierung relativ zum Sichtfeld). */
  const host = ref<HTMLElement | null>(null)
  const contentHeight = ref(0)
  /** Aktuelle Innenbreite des Scroll-Containers (fuer "An Breite anpassen"). */
  const hostWidth = ref(0)
  // "An Breite anpassen": auf schmalen Bildschirmen das Blatt automatisch so
  // verkleinern, dass es ohne horizontales Scrollen vollstaendig sichtbar ist.
  // Bleibt aktiv, bis der Nutzer den Zoom selbst setzt; ein Wechsel von Format,
  // Ausrichtung oder zurueck in den Seiten-Modus schaltet es wieder ein.
  const autoFit = ref(true)
  // Sentinel: merkt sich den von uns gesetzten Zoom, damit der eigene
  // Schreibzugriff nicht faelschlich als Nutzer-Eingabe gewertet wird.
  let selfSetZoom: number | null = null

  const pageActive = computed(() => store.settings.pageFormat !== 'none')
  const zoom = computed(() => store.settings.pageZoom)

  const metrics = computed<PageMetrics | null>(() => {
    const dims = pageDimensions(store.settings.pageFormat, store.settings.pageOrientation)
    if (!dims) return null
    const pageW = Math.round(mmToPx(dims.widthMm))
    const pageH = Math.round(mmToPx(dims.heightMm))
    const margin = Math.round(mmToPx(DEFAULT_MARGIN_MM))
    return { pageW, pageH, margin, contentW: pageW - 2 * margin, contentH: pageH - 2 * margin }
  })

  const sheetHeight = computed(() => {
    const m = metrics.value
    if (!m) return 0
    return 2 * m.margin + Math.max(m.contentH, contentHeight.value)
  })

  const canvasStyle = computed(() =>
    metrics.value
      ? {
          width: `${metrics.value.pageW * zoom.value}px`,
          height: `${sheetHeight.value * zoom.value}px`,
        }
      : undefined,
  )

  const sheetStyle = computed(() =>
    metrics.value
      ? {
          width: `${metrics.value.pageW}px`,
          padding: `${metrics.value.margin}px`,
          transform: `scale(${zoom.value})`,
          transformOrigin: 'top left',
        }
      : undefined,
  )

  const textStyle = computed(() =>
    metrics.value && pageActive.value ? { minHeight: `${metrics.value.contentH}px` } : undefined,
  )

  /** Fuehrungslinien an den Zeilengrenzen, an denen der Export umbricht. */
  const pageBreaks = computed<number[]>(() => {
    const m = metrics.value
    if (!m || !pageActive.value) return []
    // Gleicher ganzzahliger Schritt wie Vorschau/PDF -> die Umbruch-Fuehrungslinien
    // im Editor liegen exakt dort, wo auch der Export umbricht.
    const step = pageLineStepPx(store.settings.fontSize, store.settings.lineHeight)
    const { pageStepPx, count } = paginateByLines(
      Math.max(m.contentH, contentHeight.value),
      m.contentH,
      step,
    )
    const lines: number[] = []
    for (let k = 1; k < count; k++) lines.push(m.margin + k * pageStepPx)
    return lines
  })

  function measure(): void {
    if (editable.value && pageActive.value) contentHeight.value = editable.value.scrollHeight
    if (host.value) hostWidth.value = host.value.clientWidth
  }

  /**
   * "An Breite anpassen": Nur wenn das Blatt bei 100 % breiter ist als der
   * verfuegbare Platz (also auf Telefon-/Schmal-Displays), wird der Zoom auf den
   * Faktor gesetzt, bei dem das Blatt die Breite gerade ausfuellt. Dadurch ist
   * ein ganzes A4 ohne horizontales Scrollen sichtbar. Auf breiten Bildschirmen
   * (Blatt passt bei 100 %) bleibt der eingestellte Zoom unangetastet, es wird
   * nie ueber 100 % hinaus vergroessert. Es wird derselbe pageZoom geschrieben,
   * den auch der Regler nutzt -> Blatt, Seitenumbruch und Bildkoordinaten
   * bleiben deckungsgleich (WYSIWYG). pageZoom zaehlt nicht zur Undo-History.
   */
  function applyFit(): void {
    if (!autoFit.value || !pageActive.value) return
    const m = metrics.value
    if (!m || hostWidth.value <= 0) return
    const avail = hostWidth.value - 2 * BACKDROP_PAD
    // Passt das Blatt bei 100 % schon hinein -> nichts tun (Desktop unberuehrt).
    if (avail <= 0 || avail >= m.pageW) return
    // Abrunden auf zwei Stellen, damit kein Sub-Pixel-Ueberlauf bleibt.
    const raw = Math.floor((avail / m.pageW) * 100) / 100
    const target = Math.min(LIMITS.zoom.max, Math.max(LIMITS.zoom.min, raw))
    // Schwelle ~ Scrollleistenbreite: absorbiert das Zittern, wenn durch das
    // Anpassen eine Scrollleiste erscheint/verschwindet (kein Hin-und-her).
    if (Math.abs(store.settings.pageZoom - target) < 0.02) return
    selfSetZoom = target
    store.updateSettings({ pageZoom: target })
  }

  let resizeObserver: ResizeObserver | null = null
  function setupObserver(): void {
    if (typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(() => {
      measure()
      applyFit()
    })
    if (editable.value) resizeObserver.observe(editable.value)
    // Auch die Breite des Scroll-Containers beobachten (Drehen des Geraets,
    // Fenster-/Spalten-Resize) -> Auto-Fit neu berechnen.
    if (host.value) resizeObserver.observe(host.value)
  }

  watch([pageActive, metrics], () => nextTick(measure))

  // Neuer Layout-Kontext (Seiten-Modus betreten, Format/Ausrichtung gewechselt)
  // -> Auto-Fit wieder einschalten und neu einpassen.
  watch(
    () => [pageActive.value, store.settings.pageFormat, store.settings.pageOrientation],
    () => {
      autoFit.value = true
      nextTick(applyFit)
    },
  )

  // Aendert der Nutzer den Zoom selbst (Regler, %-Zuruecksetzen), Auto-Fit
  // abschalten -- wir ueberschreiben seine Wahl nicht mehr (bis zum naechsten
  // Layout-Wechsel). Unseren eigenen Schreibzugriff per Sentinel ausnehmen.
  watch(
    () => store.settings.pageZoom,
    (z) => {
      if (selfSetZoom !== null && Math.abs(z - selfSetZoom) < 0.005) {
        selfSetZoom = null
        return
      }
      autoFit.value = false
    },
  )

  onMounted(() => {
    setupObserver()
    nextTick(() => {
      measure()
      applyFit()
    })
  })
  onBeforeUnmount(() => resizeObserver?.disconnect())

  return {
    host,
    contentHeight,
    pageActive,
    zoom,
    metrics,
    sheetHeight,
    canvasStyle,
    sheetStyle,
    textStyle,
    pageBreaks,
    measure,
  }
}
