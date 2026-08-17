import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { pageDimensions } from '@/utils/pageFormats'
import { DEFAULT_MARGIN_MM, mmToPx, lineStepPx, paginateByLines } from '@/utils/renderPages'

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
    const step = lineStepPx(store.settings.fontSize, store.settings.lineHeight)
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
  }

  let resizeObserver: ResizeObserver | null = null
  function setupObserver(): void {
    if (typeof ResizeObserver === 'undefined' || !editable.value) return
    resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(editable.value)
  }

  watch([pageActive, metrics], () => nextTick(measure))

  onMounted(() => {
    setupObserver()
    nextTick(measure)
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
