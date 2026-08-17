<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore, type ImagePlacement } from '@/stores/editor'
import type { Transform } from '@/utils/textTransforms'
import type { BlockType, SelectionFormat } from '@/types'
import { buildSearchRegex, countMatches as countInText, type FindOptions } from '@/utils/find'
import { pageDimensions } from '@/utils/pageFormats'
import { DEFAULT_MARGIN_MM, mmToPx, lineStepPx, paginateByLines } from '@/utils/renderPages'
import { htmlToPlain, plainToHtml, sanitizeHtml, sanitizeUrl } from '@/utils/richText'
import { useAnchoredMenu } from '@/composables/useAnchoredMenu'
import { useI18n } from '@/i18n'

const store = useEditorStore()
const { t } = useI18n()

const emit = defineEmits<{
  cursor: [line: number, col: number]
  selchange: [state: SelectionFormat]
}>()

// Der Editor ist ein contenteditable-Feld: nur so kann ein einzelnes Wort eine
// eigene Auszeichnung (Fett/Kursiv/Farbe) tragen. Der Inhalt wird als HTML im
// Store gehalten; reiner Text wird bei Bedarf abgeleitet (store.activePlain).
const editable = ref<HTMLElement | null>(null)

/**
 * Zeilenumbruch als Inline-Style (kein sinnvolles Gegenstueck als CSS-Variable).
 * Schrift/Groesse/Farbe/Ausrichtung kommen als --editor-*-Variablen von useTheme;
 * Inline-Auszeichnungen im Text ueberschreiben Gewicht/Stil/Farbe punktuell.
 */
const editorStyle = computed(() => ({
  whiteSpace: store.settings.wordWrap ? ('pre-wrap' as const) : ('pre' as const),
}))

/* ---------- Inhalt <-> Store synchronisieren ---------- */
/**
 * Schreibt den Store-Inhalt in das Feld -- aber nur bei EXTERNEN Aenderungen
 * (Dokumentwechsel, Undo/Redo, Transformation, Suchen&Ersetzen). Beim Tippen
 * setzt der Editor selbst den Store auf sein aktuelles innerHTML; dann stimmen
 * beide ueberein und es wird NICHT neu geschrieben -- so bleibt der Cursor stehen.
 */
function renderFromStore(caretToEnd = false): void {
  const el = editable.value
  if (!el) return
  if (el.innerHTML === store.activeContent) return
  el.innerHTML = store.activeContent
  if (caretToEnd) placeCaretEnd()
  nextTick(measure)
}

/** Liest das Feld und schiebt es in den Store (Tippen -> debounced eine Stufe). */
function syncFromDom(): void {
  const el = editable.value
  if (!el) return
  store.updateContent(el.innerHTML)
  measure()
  reportCursor()
  reportSelection()
}

// Waehrend eines eigenen Kommandos (Fett/Kursiv/Farbe/Einfuegen/Zuruecksetzen)
// wird das vom Browser ausgeloeste input-Event unterdrueckt: solche Aktionen
// sollen NICHT ueber den (zusammenfassenden) Tipp-Pfad laufen, sondern als eine
// eigene, klar abgegrenzte Undo-Stufe committet werden.
let suppressInput = false

function onInput(): void {
  if (suppressInput) return
  syncFromDom()
}

/** Schreibt den aktuellen Feldinhalt als EINE eigene Undo-Stufe fest. */
function commitDiscrete(): void {
  const el = editable.value
  if (!el) return
  store.replaceContent(el.innerHTML)
  measure()
  reportCursor()
  reportSelection()
}

/**
 * Fuehrt ein contenteditable-Kommando aus und macht daraus genau eine Undo-Stufe.
 * Die zuletzt gemerkte Auswahl wird vorher wiederhergestellt, damit ein Klick auf
 * die Format-Leiste (der den Fokus kurz nimmt) die Auswahl nicht verliert.
 */
function runCommand(fn: () => void): void {
  const el = editable.value
  if (!el) return
  el.focus()
  restoreSelection()
  ensureCssStyling()
  suppressInput = true
  try {
    fn()
  } finally {
    suppressInput = false
  }
  commitDiscrete()
}

function placeCaretEnd(): void {
  const el = editable.value
  if (!el) return
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}

onMounted(() => {
  store.normalizeActiveToHtml()
  if (editable.value) editable.value.innerHTML = store.activeContent
  setupObserver()
  nextTick(measure)
  document.addEventListener('selectionchange', onSelectionChange)
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.removeEventListener('selectionchange', onSelectionChange)
})

// Dokumentwechsel: Inhalt neu einsetzen (in HTML normalisiert).
watch(
  () => store.activeId,
  () => {
    store.normalizeActiveToHtml()
    nextTick(() => renderFromStore(false))
  },
)
// Externe Inhaltsaenderung (Undo/Redo/Transform/Ersetzen): Feld nachziehen.
watch(
  () => store.activeContent,
  () => renderFromStore(true),
)

/* ---------- Seiten-Ansicht (A4/A3/...) ---------- */
const host = ref<HTMLElement | null>(null)
const contentHeight = ref(0)

const pageActive = computed(() => store.settings.pageFormat !== 'none')
const zoom = computed(() => store.settings.pageZoom)

const metrics = computed(() => {
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

/* ---------- Cursor-Position (Zeile/Spalte) ---------- */
function reportCursor(): void {
  const el = editable.value
  const sel = window.getSelection()
  if (!el || !sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (!el.contains(range.startContainer)) return
  const pre = document.createRange()
  pre.selectNodeContents(el)
  pre.setEnd(range.startContainer, range.startOffset)
  const holder = document.createElement('div')
  holder.appendChild(pre.cloneContents())
  const before = htmlToPlain(holder.innerHTML)
  const line = before.split('\n').length
  const col = before.length - before.lastIndexOf('\n')
  emit('cursor', line, col)
}

/* ---------- Auswahl-Format an die Format-Leiste melden ---------- */
function reportSelection(): void {
  const el = editable.value
  const sel = window.getSelection()
  let inside = false
  let collapsed = true
  if (el && sel && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0)
    inside = el.contains(range.commonAncestorContainer)
    collapsed = sel.isCollapsed
  }
  let bold = false
  let italic = false
  let underline = false
  let strikethrough = false
  let highlight = false
  let link = false
  let linkHref = ''
  let quote = false
  let allSelected = false
  let bulletList = false
  let numberedList = false
  let block: BlockType = 'p'
  if (inside) {
    try {
      bold = document.queryCommandState('bold')
      italic = document.queryCommandState('italic')
      underline = document.queryCommandState('underline')
      strikethrough = document.queryCommandState('strikeThrough')
      bulletList = document.queryCommandState('insertUnorderedList')
      numberedList = document.queryCommandState('insertOrderedList')
    } catch {
      /* queryCommandState evtl. nicht verfuegbar */
    }
    highlight = ancestorTag(['MARK']) !== null
    const anchor = ancestorTag(['A']) as HTMLAnchorElement | null
    link = anchor !== null
    linkHref = anchor?.getAttribute('href') ?? ''
    quote = ancestorTag(['BLOCKQUOTE']) !== null
    block = currentBlock()
    if (el && sel && !collapsed) {
      const full = document.createRange()
      full.selectNodeContents(el)
      const r = sel.getRangeAt(0)
      allSelected =
        r.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
        r.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    }
  }
  emit('selchange', {
    hasSelection: inside && !collapsed,
    allSelected,
    bold,
    italic,
    underline,
    strikethrough,
    highlight,
    link,
    linkHref,
    color: '',
    block,
    quote,
    bulletList,
    numberedList,
  })
}

/**
 * Sucht vom Anfang der aktuellen Auswahl aus nach oben das naechste Element mit
 * einem der angegebenen Tags (innerhalb des Feldes). Fuer die Zustaende der
 * Format-Leiste (Highlight/Link/Zitat), die queryCommandState nicht kennt.
 */
function ancestorTag(tags: string[]): HTMLElement | null {
  const el = editable.value
  const sel = window.getSelection()
  if (!el || !sel || sel.rangeCount === 0) return null
  let node: Node | null = sel.getRangeAt(0).startContainer
  while (node && node !== el) {
    if (node.nodeType === Node.ELEMENT_NODE && tags.includes((node as HTMLElement).tagName)) {
      return node as HTMLElement
    }
    node = node.parentNode
  }
  return null
}

// Letzte echte (nicht leere) Auswahl im Feld -- damit ein Klick auf einen
// Format-Knopf (der das Feld kurz den Fokus verlieren laesst) die Auswahl nicht
// verliert.
let savedRange: Range | null = null

function onSelectionChange(): void {
  // Nur reagieren, wenn die Auswahl in unserem Feld liegt.
  const el = editable.value
  const sel = window.getSelection()
  if (!el || !sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)
  if (!el.contains(range.commonAncestorContainer)) return
  // Eine echte Auswahl merken; ein bewusst IM Feld gesetzter Cursor (kollabiert)
  // verwirft die alte Auswahl -- sonst wuerde ein spaeterer Befehl (z. B. Absatz/
  // Ueberschrift ueber das Auswahlfeld) faelschlich auf die alte, laengst
  // ueberholte Markierung wirken. Ein Klick auf ein Leisten-Control laesst die
  // Auswahl das Feld verlassen -> onSelectionChange greift hier gar nicht.
  savedRange = sel.isCollapsed ? null : range.cloneRange()
  reportSelection()
  reportCursor()
}

/** Stellt die zuletzt gemerkte Auswahl wieder her, falls der Fokus/die Auswahl
 *  beim Klick auf die Leiste verloren ging. */
function restoreSelection(): void {
  const el = editable.value
  const sel = window.getSelection()
  if (!el || !sel) return
  const valid =
    sel.rangeCount > 0 && !sel.isCollapsed && el.contains(sel.getRangeAt(0).commonAncestorContainer)
  if (valid || !savedRange) return
  sel.removeAllRanges()
  sel.addRange(savedRange)
}

/* ---------- Tastatur / Einfuegen ---------- */
function onTab(e: KeyboardEvent): void {
  e.preventDefault()
  insertText('  ')
}

function insertText(text: string): void {
  editable.value?.focus()
  document.execCommand('insertText', false, text)
  syncFromDom()
}

function onPaste(e: ClipboardEvent): void {
  e.preventDefault()
  const data = e.clipboardData
  if (!data) return
  const html = data.getData('text/html')
  runCommand(() => {
    if (html) document.execCommand('insertHTML', false, sanitizeHtml(html))
    else document.execCommand('insertText', false, data.getData('text/plain'))
  })
}

/* ---------- Inline-Formatierung (Fett/Kursiv/Farbe) ---------- */
function ensureCssStyling(): void {
  // Farbe/Gewicht/Stil als CSS-Style (span) statt <font>-Tags erzeugen.
  try {
    document.execCommand('styleWithCSS', false, 'true')
  } catch {
    /* aeltere Engines ignorieren das */
  }
}

function toggleBold(): void {
  runCommand(() => document.execCommand('bold'))
}

function toggleItalic(): void {
  runCommand(() => document.execCommand('italic'))
}

function applyColor(color: string): void {
  const el = editable.value
  if (!el) return
  // Leere Farbe ("Automatisch"): auf die aktuelle Standard-Textfarbe setzen.
  const value = color || rgbToHex(getComputedStyle(el).color) || '#111827'
  runCommand(() => document.execCommand('foreColor', false, value))
}

/* ---------- Erweiterte Auszeichnung (Unterstrichen/Durchgestrichen/Highlight/Link/Zitat) ---------- */

/**
 * Unterstrichen bzw. durchgestrichen bewusst OHNE styleWithCSS: so erzeugt der
 * Browser die Tags <u>/<strike> (bzw. <s>) statt eines <span
 * style="text-decoration">. Der Style wuerde von der Bereinigung entfernt (die
 * Style-Allowlist kennt nur Farbe/Gewicht/Stil) -- die Tags bleiben dagegen
 * erhalten und werden auch sauber zu Markdown.
 */
function toggleUnderline(): void {
  runCommand(() => {
    try {
      document.execCommand('styleWithCSS', false, 'false')
    } catch {
      /* aeltere Engines ignorieren das */
    }
    document.execCommand('underline')
  })
}

function toggleStrikethrough(): void {
  runCommand(() => {
    try {
      document.execCommand('styleWithCSS', false, 'false')
    } catch {
      /* aeltere Engines ignorieren das */
    }
    document.execCommand('strikeThrough')
  })
}

/**
 * Highlight (<mark>) hat kein execCommand-Gegenstueck. Liegt die Auswahl bereits
 * in einer Hervorhebung, wird diese aufgehoben; sonst wird die Auswahl in ein
 * <mark> verpackt (verschachtelte <mark> werden dabei entfernt).
 */
function toggleHighlight(): void {
  runCommand(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const existing = ancestorTag(['MARK'])
    if (existing) {
      unwrapElement(existing)
      return
    }
    const range = sel.getRangeAt(0)
    const fragment = range.extractContents()
    // Bereits enthaltene Hervorhebungen aufloesen, damit kein <mark><mark> entsteht.
    fragment.querySelectorAll('mark').forEach((m) => {
      const parent = m.parentNode
      if (!parent) return
      while (m.firstChild) parent.insertBefore(m.firstChild, m)
      parent.removeChild(m)
    })
    const mark = document.createElement('mark')
    mark.appendChild(fragment)
    range.insertNode(mark)
    const next = document.createRange()
    next.selectNodeContents(mark)
    sel.removeAllRanges()
    sel.addRange(next)
  })
}

/** Ersetzt ein Element durch seinen Inhalt (Highlight/Link aufheben). */
function unwrapElement(el: HTMLElement): void {
  const parent = el.parentNode
  if (!parent) return
  const sel = window.getSelection()
  const range = document.createRange()
  range.setStartBefore(el.firstChild ?? el)
  while (el.firstChild) parent.insertBefore(el.firstChild, el)
  range.setEndBefore(el)
  parent.removeChild(el)
  if (sel) {
    sel.removeAllRanges()
    sel.addRange(range)
  }
}

/**
 * Setzt einen Link auf die Auswahl (oder aktualisiert einen bestehenden). Ein
 * leerer/ungueltiger Wert entfernt den Link. Die Ziel-URL wird normalisiert
 * (fehlt ein Schema, wird http(s)/mailto ergaenzt).
 */
function createLink(url: string): void {
  const value = normalizeUrl(url)
  if (!value) {
    removeLink()
    return
  }
  runCommand(() => {
    // Steht der Cursor in einem bestehenden Link, diesen zuerst markieren, damit
    // createLink die komplette Ziel-URL ersetzt (statt nur einen Teil).
    const existing = ancestorTag(['A'])
    if (existing) {
      const range = document.createRange()
      range.selectNodeContents(existing)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    document.execCommand('createLink', false, value)
  })
}

function removeLink(): void {
  runCommand(() => {
    const existing = ancestorTag(['A'])
    // Ohne Auswahl den ganzen Link markieren, damit unlink greift.
    if (existing) {
      const range = document.createRange()
      range.selectNodeContents(existing)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
    document.execCommand('unlink')
  })
}

/** Ergaenzt eine fehlende URL-Kennung; leere Eingabe -> ''. */
function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  // Bereits mit Schema, ankerlokal (#), absolut (/) oder mailto/tel -> unveraendert.
  if (/^([a-z][a-z0-9+.-]*:|#|\/|\.{1,2}\/)/i.test(trimmed)) return trimmed
  // E-Mail-artig ohne Schema -> mailto:.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`
  return `https://${trimmed}`
}

/**
 * Zitat (blockquote) fuer die aktuelle Zeile(n) an/aus. Steht die Auswahl bereits
 * in einem Zitat, wird es wieder in normale Zeilen (<div>) aufgeloest; sonst wird
 * die Zeile in ein blockquote verpackt. Zuvor wird sie -- wie bei Ueberschriften
 * -- aus einer eventuellen Liste geloest.
 */
function toggleQuote(): void {
  runCommand(() => {
    if (ancestorTag(['BLOCKQUOTE'])) {
      document.execCommand('formatBlock', false, '<div>')
      return
    }
    let guard = 0
    while (selectionInList() && guard++ < 6) {
      if (!document.execCommand('outdent')) break
    }
    document.execCommand('formatBlock', false, '<blockquote>')
    normalizeRichBlocks()
  })
}

/**
 * Entfernt Fett/Kursiv/Farbe. Ist Text markiert, nur dort; sonst im ganzen
 * Dokument. Eine eigene Undo-Stufe.
 */
function clearFormatting(): void {
  const el = editable.value
  if (!el) return
  el.focus()
  // Bewusst KEIN restoreSelection: eine echte Auswahl bleibt dank
  // @mousedown.prevent am Knopf erhalten; ohne Auswahl soll wirklich das ganze
  // Dokument neutralisiert werden (nicht die zuletzt gemerkte Auswahl).
  const sel = window.getSelection()
  const hadSelection = !!(
    sel &&
    sel.rangeCount > 0 &&
    !sel.isCollapsed &&
    el.contains(sel.getRangeAt(0).commonAncestorContainer)
  )
  ensureCssStyling()
  suppressInput = true
  try {
    if (!hadSelection && sel) {
      const range = document.createRange()
      range.selectNodeContents(el)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    // removeFormat entfernt Fett/Kursiv/Farbe/Unterstrichen/Durchgestrichen,
    // aber weder Links noch Highlights -- diese daher zusaetzlich aufloesen.
    document.execCommand('removeFormat')
    document.execCommand('unlink')
    const activeRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
    el.querySelectorAll('mark').forEach((m) => {
      if (activeRange && !activeRange.intersectsNode(m)) return
      const parent = m.parentNode
      if (!parent) return
      while (m.firstChild) parent.insertBefore(m.firstChild, m)
      parent.removeChild(m)
    })
  } finally {
    suppressInput = false
  }
  if (!hadSelection) window.getSelection()?.removeAllRanges()
  commitDiscrete()
}

/* ---------- Bloecke (Ueberschriften) und Listen ---------- */
/**
 * Raeumt ungueltige Verschachtelung von Ueberschrift und Liste auf. Der Browser
 * verpackt beim Kombinieren (z. B. "alles markieren -> Liste, dann Ueberschrift")
 * die Liste gern IN eine Ueberschrift (`<h1><ol>...</ol></h1>`) -- dann erben die
 * Eintraege die H1-Groesse und der Markdown-Export verliert die Liste.
 * Ueberschrift + Liste ist kein sinnvoller Block: die Liste gewinnt.
 */
function normalizeRichBlocks(): void {
  const el = editable.value
  if (!el) return
  // Liste in Ueberschrift -> Ueberschrift aufloesen (Inhalt inkl. Liste bleibt).
  el.querySelectorAll('h1, h2, h3').forEach((h) => {
    if (!h.querySelector('ul, ol')) return
    const parent = h.parentNode
    if (!parent) return
    while (h.firstChild) parent.insertBefore(h.firstChild, h)
    parent.removeChild(h)
  })
  // Ueberschrift in einem Listeneintrag -> entfernen (Text bleibt).
  el.querySelectorAll('li h1, li h2, li h3').forEach((h) => {
    const parent = h.parentNode
    if (!parent) return
    while (h.firstChild) parent.insertBefore(h.firstChild, h)
    parent.removeChild(h)
  })
  // Benachbarte gleichartige Listen zusammenfuehren (execCommand splittet oft).
  el.querySelectorAll('ul, ol').forEach((list) => {
    let next = list.nextElementSibling
    while (next && next.tagName === list.tagName) {
      const after = next.nextElementSibling
      while (next.firstChild) list.appendChild(next.firstChild)
      next.remove()
      next = after
    }
  })
}

/** Liegt die aktuelle Auswahl in einer Liste (li/ul/ol)? */
function selectionInList(): boolean {
  const el = editable.value
  const sel = window.getSelection()
  if (!el || !sel || sel.rangeCount === 0) return false
  let node: Node | null = sel.getRangeAt(0).startContainer
  while (node && node !== el) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName
      if (tag === 'LI' || tag === 'UL' || tag === 'OL') return true
    }
    node = node.parentNode
  }
  return false
}

/**
 * Setzt den Blocktyp der aktuellen Zeile(n). 'p' = normale Zeile (wieder ein
 * <div>, wie der Editor sie sonst nutzt). Eine eigene Undo-Stufe.
 *
 * Steht die Zeile in einer Liste, wird sie zuerst per `outdent` aus der Liste
 * geloest -- so wird die Ueberschrift (bzw. der Absatz) NICHT Teil der Liste,
 * sondern steht davor/dahinter. (Ohne dies verpackt der Browser die Liste in die
 * Ueberschrift; hier "gewinnt" bewusst die Ueberschrift, beim Listen-Knopf die
 * Liste.)
 */
function setBlock(block: BlockType): void {
  runCommand(() => {
    let guard = 0
    while (selectionInList() && guard++ < 6) {
      if (!document.execCommand('outdent')) break
    }
    // Bracket-Form ('<h1>') ist die breit kompatible Schreibweise fuer
    // formatBlock. Normal -> <div> (der Editor arbeitet mit <div>-Zeilen).
    document.execCommand('formatBlock', false, block === 'p' ? '<div>' : `<${block}>`)
    normalizeRichBlocks()
  })
}

function toggleBulletList(): void {
  runCommand(() => {
    document.execCommand('insertUnorderedList')
    normalizeRichBlocks()
  })
}

function toggleNumberedList(): void {
  runCommand(() => {
    document.execCommand('insertOrderedList')
    normalizeRichBlocks()
  })
}

/** Blocktyp an der aktuellen Cursorposition (fuer die Format-Leiste). */
function currentBlock(): BlockType {
  const el = editable.value
  const sel = window.getSelection()
  if (!el || !sel || sel.rangeCount === 0) return 'p'
  let node: Node | null = sel.getRangeAt(0).startContainer
  while (node && node !== el) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = (node as HTMLElement).tagName
      if (tag === 'H1') return 'h1'
      if (tag === 'H2') return 'h2'
      if (tag === 'H3') return 'h3'
    }
    node = node.parentNode
  }
  return 'p'
}

function rgbToHex(rgb: string): string {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (!m) return ''
  const hex = (n: string): string => Number(n).toString(16).padStart(2, '0')
  return `#${hex(m[1]!)}${hex(m[2]!)}${hex(m[3]!)}`
}

/* ---------- Transformationen (Auswahl oder ganzer Text) ---------- */
function applyTransform(fn: Transform): void {
  const el = editable.value
  const sel = window.getSelection()
  const hasSel =
    el &&
    sel &&
    sel.rangeCount > 0 &&
    !sel.isCollapsed &&
    el.contains(sel.getRangeAt(0).commonAncestorContainer)
  if (hasSel) {
    // Auswahl: transformierten reinen Text einsetzen (Auszeichnung der Auswahl
    // geht dabei verloren -- Transformationen sind Text-Operationen).
    const replacement = fn(sel!.toString())
    runCommand(() => document.execCommand('insertText', false, replacement))
  } else {
    // Ganzer Text: auf reinen Text anwenden (formatiert danach neutral).
    store.replaceContent(plainToHtml(fn(store.activePlain)))
  }
}

function focusEditor(): void {
  editable.value?.focus()
}

/* ---------- Alles markieren / Auswahl aufheben ---------- */
function selectAll(): void {
  const el = editable.value
  if (!el) return
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  if (!sel?.isCollapsed) savedRange = range.cloneRange()
  reportSelection()
  reportCursor()
}

function deselect(): void {
  const sel = window.getSelection()
  sel?.removeAllRanges()
  // Gemerkte Auswahl verwerfen, damit ein spaeteres Format-Kommando sie nicht
  // wiederherstellt.
  savedRange = null
  reportSelection()
}

/* ---------- Bilder: einfuegen, verschieben, skalieren, loeschen ---------- */
const selectedImageId = ref<string | null>(null)
const MIN_IMAGE = 24

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Bild-Overlay-Style (content-relativ; sitzt im skalierten Blatt). */
function imageStyle(img: ImagePlacement): Record<string, string> {
  const m = metrics.value
  const left = (m ? m.margin : 0) + img.x
  const top = (m ? m.margin : 0) + img.y
  return { left: `${left}px`, top: `${top}px`, width: `${img.w}px`, height: `${img.h}px` }
}

/** Verkleinert das Bild (max. Kante 1400 px) und liefert eine data-URL. */
function downscaleImage(file: File): Promise<{ src: string; w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1400
      const scale = Math.min(1, MAX / Math.max(image.naturalWidth, image.naturalHeight))
      const cw = Math.max(1, Math.round(image.naturalWidth * scale))
      const ch = Math.max(1, Math.round(image.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = cw
      canvas.height = ch
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('no-2d-context'))
        return
      }
      ctx.drawImage(image, 0, 0, cw, ch)
      // PNG/GIF/WEBP behalten Transparenz (PNG), Fotos werden als JPEG kleiner.
      const keepAlpha = /image\/(png|gif|webp)/i.test(file.type)
      const src = canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.85)
      resolve({ src, w: cw, h: ch })
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image-load-error'))
    }
    image.src = url
  })
}

/**
 * Fuegt ein Bild ein. Ohne Seitenformat wird A4 gewaehlt (freie Platzierung ist
 * nur mit fester Seitenbreite exakt). Startgroesse ~60 % der Inhaltsbreite,
 * zentriert, ungefaehr in der Mitte des Sichtbereichs.
 */
async function insertImageFile(file: File): Promise<boolean> {
  if (!file.type.startsWith('image/')) return false
  let img: { src: string; w: number; h: number }
  try {
    img = await downscaleImage(file)
  } catch {
    return false
  }
  if (!pageActive.value) store.updateSettings({ pageFormat: 'a4', pageOrientation: 'portrait' })
  await nextTick()
  const m = metrics.value
  if (!m) return false
  const aspect = img.w / img.h
  const w = Math.min(img.w, Math.round(m.contentW * 0.6))
  const h = Math.max(1, Math.round(w / aspect))
  const x = Math.max(0, Math.round((m.contentW - w) / 2))
  let y = 0
  const hostEl = host.value
  if (hostEl) {
    const center = hostEl.scrollTop + hostEl.clientHeight / 2
    y = Math.max(0, Math.round((center - 16 - m.margin * zoom.value) / zoom.value - h / 2))
  }
  const id = store.addImage({ src: img.src, x, y, w, h })
  if (!id) return false
  selectedImageId.value = id
  editable.value?.blur()
  nextTick(measure)
  return true
}

function selectImage(id: string): void {
  selectedImageId.value = id
  editable.value?.blur()
}

function deleteImage(id: string): void {
  store.removeImage(id)
  if (selectedImageId.value === id) selectedImageId.value = null
}

/* ---------- Bild verlinken ---------- */
// Kleines Popover direkt an der Link-Schaltflaeche des Bildes (per Teleport im
// <body>) -- bewusst KEIN Vollbild-Overlay, damit weder der globale Footer
// verdeckt noch das Scrollen der Seite blockiert wird.
const {
  open: imageLinkOpen,
  anchorEl: imageLinkAnchor,
  menuEl: imageLinkMenu,
  style: imageLinkStyle,
  openMenu: openImageLinkMenu,
  close: closeImageLinkMenu,
} = useAnchoredMenu(260)
// Welches Bild wird gerade verlinkt (null = zu) und der Eingabewert.
const imageLinkId = ref<string | null>(null)
const imageLinkUrl = ref('')
const imageLinkInput = ref<HTMLInputElement | null>(null)

/** Oeffnet den Link-Editor fuer ein Bild (vorbelegt mit dem aktuellen Ziel). */
function openImageLink(img: ImagePlacement, e: Event): void {
  selectImage(img.id)
  // Popover an der angeklickten Schaltflaeche verankern.
  imageLinkAnchor.value = e.currentTarget as HTMLElement
  imageLinkId.value = img.id
  imageLinkUrl.value = img.href ?? ''
  openImageLinkMenu()
  nextTick(() => {
    imageLinkInput.value?.focus()
    imageLinkInput.value?.select()
  })
}

function closeImageLink(): void {
  closeImageLinkMenu()
  imageLinkId.value = null
}

/**
 * Uebernimmt das Link-Ziel des Bildes. Die URL wird normalisiert (fehlendes
 * Schema ergaenzt) und auf ein sicheres Schema geprueft; ein leerer/ungueltiger
 * Wert entfernt den Link. Als EINE Undo-Stufe (begin/commitImageChange).
 */
function applyImageLink(): void {
  const id = imageLinkId.value
  if (!id) return
  const href = sanitizeUrl(normalizeUrl(imageLinkUrl.value))
  store.beginImageChange()
  store.updateImage(id, { href })
  store.commitImageChange()
  closeImageLink()
}

function removeImageLink(): void {
  imageLinkUrl.value = ''
  applyImageLink()
}

/** Ziehen zum Verschieben. Bildschirm-Delta wird durch den Zoom geteilt. */
function startDrag(img: ImagePlacement, e: PointerEvent): void {
  selectImage(img.id)
  const m = metrics.value
  if (!m) return
  // Ganze Ziehbewegung = eine Undo-Stufe.
  store.beginImageChange()
  const z = zoom.value
  const startX = e.clientX
  const startY = e.clientY
  const ox = img.x
  const oy = img.y
  const move = (ev: PointerEvent): void => {
    const nx = clamp(ox + (ev.clientX - startX) / z, 0, m.contentW - img.w)
    const ny = Math.max(0, oy + (ev.clientY - startY) / z)
    store.updateImage(img.id, { x: Math.round(nx), y: Math.round(ny) })
    nextTick(measure)
  }
  const up = (): void => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    store.commitImageChange()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** Ziehen an der Ecke zum Skalieren (Seitenverhaeltnis bleibt erhalten). */
function startResize(img: ImagePlacement, e: PointerEvent): void {
  selectImage(img.id)
  const m = metrics.value
  if (!m) return
  // Ganze Skalier-Bewegung = eine Undo-Stufe.
  store.beginImageChange()
  const z = zoom.value
  const startX = e.clientX
  const ow = img.w
  const aspect = img.w / img.h
  const move = (ev: PointerEvent): void => {
    const nw = clamp(ow + (ev.clientX - startX) / z, MIN_IMAGE, m.contentW - img.x)
    store.updateImage(img.id, { w: Math.round(nw), h: Math.max(1, Math.round(nw / aspect)) })
    nextTick(measure)
  }
  const up = (): void => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    store.commitImageChange()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

/** Entf/Backspace loescht das gewaehlte Bild -- nur, wenn nicht im Text getippt wird. */
function onImageKeydown(e: KeyboardEvent): void {
  if (!selectedImageId.value) return
  if (document.activeElement === editable.value) return
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    deleteImage(selectedImageId.value)
  }
}
onMounted(() => document.addEventListener('keydown', onImageKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onImageKeydown))

/* ---------- Suchen & Ersetzen (ueber die Textknoten des Feldes) ---------- */
function textNodes(): Text[] {
  const el = editable.value
  if (!el) return []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n = walker.nextNode()
  while (n) {
    nodes.push(n as Text)
    n = walker.nextNode()
  }
  return nodes
}

function fullText(nodes: Text[]): string {
  return nodes.map((n) => n.nodeValue ?? '').join('')
}

function pointAt(nodes: Text[], offset: number): { node: Text; offset: number } | null {
  let acc = 0
  for (const node of nodes) {
    const len = node.nodeValue?.length ?? 0
    if (offset <= acc + len) return { node, offset: offset - acc }
    acc += len
  }
  const last = nodes[nodes.length - 1]
  return last ? { node: last, offset: last.nodeValue?.length ?? 0 } : null
}

function selectionOffset(nodes: Text[]): number {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return 0
  const range = sel.getRangeAt(0)
  let acc = 0
  for (const node of nodes) {
    if (node === range.endContainer) return acc + range.endOffset
    acc += node.nodeValue?.length ?? 0
  }
  return 0
}

function selectOffsets(nodes: Text[], start: number, end: number): void {
  const a = pointAt(nodes, start)
  const b = pointAt(nodes, end)
  if (!a || !b) return
  const range = document.createRange()
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  const rect = range.getBoundingClientRect()
  const host = editable.value?.closest('.page-backdrop, .plain-scroll') as HTMLElement | null
  if (host && rect.height) {
    const hostRect = host.getBoundingClientRect()
    if (rect.top < hostRect.top || rect.bottom > hostRect.bottom) {
      host.scrollTop += rect.top - hostRect.top - host.clientHeight / 2
    }
  }
  reportCursor()
}

function findNext(query: string, opts: FindOptions): boolean {
  const nodes = textNodes()
  const text = fullText(nodes)
  const re = buildSearchRegex(query, opts, true)
  if (!re) return false
  re.lastIndex = selectionOffset(nodes)
  let m = re.exec(text)
  if (!m) {
    re.lastIndex = 0
    m = re.exec(text)
  }
  if (!m) return false
  editable.value?.focus()
  selectOffsets(nodes, m.index, m.index + m[0].length)
  return true
}

function findPrev(query: string, opts: FindOptions): boolean {
  const nodes = textNodes()
  const text = fullText(nodes)
  const re = buildSearchRegex(query, opts, true)
  if (!re) return false
  const sel = window.getSelection()
  const limit = sel && sel.rangeCount > 0 ? offsetOfStart(nodes, sel.getRangeAt(0)) : text.length
  let last: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index < limit) last = m
    else break
    if (m[0] === '') re.lastIndex++
  }
  if (!last) {
    re.lastIndex = 0
    while ((m = re.exec(text)) !== null) {
      last = m
      if (m[0] === '') re.lastIndex++
    }
  }
  if (!last) return false
  editable.value?.focus()
  selectOffsets(nodes, last.index, last.index + last[0].length)
  return true
}

function offsetOfStart(nodes: Text[], range: Range): number {
  let acc = 0
  for (const node of nodes) {
    if (node === range.startContainer) return acc + range.startOffset
    acc += node.nodeValue?.length ?? 0
  }
  return 0
}

function replaceCurrent(query: string, replacement: string, opts: FindOptions): boolean {
  const sel = window.getSelection()
  const re = buildSearchRegex(query, opts, false)
  if (!re || !sel || sel.rangeCount === 0 || sel.isCollapsed) return findNext(query, opts)
  const selected = sel.toString()
  if (!re.test(selected)) return findNext(query, opts)
  const range = sel.getRangeAt(0)
  range.deleteContents()
  const node = document.createTextNode(replacement)
  range.insertNode(node)
  const after = document.createRange()
  after.setStartAfter(node)
  after.collapse(true)
  sel.removeAllRanges()
  sel.addRange(after)
  syncFromDom()
  return findNext(query, opts)
}

function replaceAll(query: string, replacement: string, opts: FindOptions): number {
  const re = buildSearchRegex(query, opts, true)
  if (!re) return 0
  let count = 0
  for (const node of textNodes()) {
    const value = node.nodeValue ?? ''
    re.lastIndex = 0
    const next = value.replace(re, () => {
      count++
      return replacement
    })
    if (next !== value) node.nodeValue = next
  }
  if (count > 0) syncFromDom()
  return count
}

function countMatches(query: string, opts: FindOptions): number {
  const text = editable.value ? fullText(textNodes()) : store.activePlain
  return countInText(text, query, opts)
}

defineExpose({
  focusEditor,
  applyTransform,
  insertText,
  findNext,
  findPrev,
  replaceCurrent,
  replaceAll,
  countMatches,
  toggleBold,
  toggleItalic,
  applyColor,
  toggleUnderline,
  toggleStrikethrough,
  toggleHighlight,
  createLink,
  removeLink,
  toggleQuote,
  clearFormatting,
  setBlock,
  toggleBulletList,
  toggleNumberedList,
  selectAll,
  deselect,
  insertImageFile,
})
</script>

<template>
  <div
    ref="host"
    :class="pageActive ? 'page-backdrop h-full min-h-0' : 'plain-scroll flex h-full min-h-0 w-full'"
  >
    <div :class="pageActive ? 'page-canvas' : 'flex h-full min-h-0 w-full'" :style="canvasStyle">
      <div :class="pageActive ? 'page-sheet' : 'flex h-full min-h-0 w-full'" :style="sheetStyle">
        <div
          v-for="(y, i) in pageBreaks"
          :key="i"
          class="page-break-guide"
          :style="{ top: `${y}px` }"
          aria-hidden="true"
        />
        <div
          ref="editable"
          class="editor-text editor-rich outline-none"
          :class="
            pageActive ? 'relative block w-full' : 'plain-pad min-h-0 w-full flex-1 overflow-auto'
          "
          :style="[editorStyle, textStyle]"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          spellcheck="true"
          :data-placeholder="t.editor.placeholder"
          @input="onInput"
          @keydown.tab="onTab"
          @keyup="reportCursor"
          @mouseup="reportSelection"
          @pointerdown="selectedImageId = null"
          @paste="onPaste"
        />

        <!-- Frei platzierte Bilder (nur im Seiten-Modus). Position/Groesse
             content-relativ -> deckungsgleich mit Vorschau/PDF. -->
        <template v-if="pageActive">
          <div
            v-for="img in store.activeImages"
            :key="img.id"
            class="img-frame"
            :class="{ 'img-selected': img.id === selectedImageId }"
            :style="imageStyle(img)"
            @pointerdown.stop="startDrag(img, $event)"
          >
            <img :src="img.src" class="img-el" draggable="false" alt="" />
            <!-- Kennzeichnet ein verlinktes Bild; bei Auswahl zeigt stattdessen
                 der Link-Knopf den aktiven Zustand (kein Ueberlappen der Griffe). -->
            <span
              v-if="img.href && img.id !== selectedImageId"
              class="img-linkbadge"
              :title="t.editor.imageLinked(img.href)"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" class="h-3 w-3" aria-hidden="true">
                <path
                  d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <template v-if="img.id === selectedImageId">
              <span class="img-handle" @pointerdown.stop="startResize(img, $event)" />
              <button
                type="button"
                class="img-link-btn"
                :class="{ 'img-link-active': img.href }"
                :title="t.editor.imageLink"
                :aria-label="t.editor.imageLink"
                :aria-expanded="imageLinkOpen && imageLinkId === img.id"
                @pointerdown.stop
                @click.stop="openImageLink(img, $event)"
              >
                <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
                  <path
                    d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="img-del"
                :title="t.editor.imageDelete"
                :aria-label="t.editor.imageDelete"
                @pointerdown.stop
                @click.stop="deleteImage(img.id)"
              >
                ×
              </button>
            </template>
          </div>
        </template>
      </div>
    </div>

    <!-- Bild verlinken: kompaktes Popover am Link-Knopf (Teleport im <body>).
         Als Kind des Wurzel-<div> gehalten, damit EditorArea EINEN Wurzelknoten
         hat und das von aussen gesetzte class="h-full" (Hoehenbegrenzung der
         Seiten-Ansicht) zuverlaessig geerbt wird. Bewusst KEIN Vollbild-Overlay
         -> Footer bleibt sichtbar, Seite scrollbar. -->
    <Teleport to="body">
      <div
        v-if="imageLinkOpen"
        ref="imageLinkMenu"
        class="fixed z-50 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        :style="imageLinkStyle"
        role="dialog"
        :aria-label="t.editor.imageLink"
      >
        <label
          class="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          for="img-link-input"
        >
          {{ t.editor.imageLink }}
        </label>
        <input
          id="img-link-input"
          ref="imageLinkInput"
          v-model="imageLinkUrl"
          type="url"
          inputmode="url"
          class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-accent dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          :placeholder="t.editor.imageLinkPlaceholder"
          @keydown.enter.prevent="applyImageLink"
          @keydown.esc.prevent="closeImageLink"
        />
        <div class="mt-2 flex items-center justify-between gap-2">
          <button
            v-if="imageLinkUrl"
            type="button"
            class="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            @click="removeImageLink"
          >
            {{ t.editor.imageLinkRemove }}
          </button>
          <span v-else />
          <button
            type="button"
            class="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
            @click="applyImageLink"
          >
            {{ t.editor.imageLinkApply }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.editor-text {
  font-family: var(--editor-font);
  font-weight: var(--editor-weight, 400);
  font-style: var(--editor-style, normal);
  font-size: var(--editor-size);
  line-height: var(--editor-line-height);
  letter-spacing: var(--editor-letter-spacing);
  text-align: var(--editor-align);
  color: var(--editor-color, inherit);
  overflow-wrap: break-word;
  word-break: normal;
}

/* Absaetze/Zeilen des contenteditable ohne Aussenabstand -> gleiche Zeilenhoehe
   wie im Export (Bedingung fuer den zeilengenauen Seitenumbruch). */
.editor-rich :deep(div),
.editor-rich :deep(p) {
  margin: 0;
  padding: 0;
}

/* Frei platziertes Bild (Overlay im skalierten Blatt). */
.img-frame {
  position: absolute;
  z-index: 5;
  box-sizing: border-box;
  cursor: move;
  touch-action: none;
  user-select: none;
}
.img-el {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}
.img-selected {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 1px;
}
/* Skalier-Griff unten rechts. */
.img-handle {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: rgb(var(--accent));
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: nwse-resize;
  touch-action: none;
}
/* Loeschen oben rechts. */
.img-del {
  position: absolute;
  right: -10px;
  top: -10px;
  display: flex;
  height: 20px;
  width: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgb(220 38 38);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}
/* Verlinken oben links. */
.img-link-btn {
  position: absolute;
  left: -10px;
  top: -10px;
  display: flex;
  height: 20px;
  width: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: #fff;
  color: rgb(63 63 70); /* zinc-700 */
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}
.img-link-btn.img-link-active {
  background: rgb(var(--accent));
  color: #fff;
}
/* Badge unten links: markiert ein verlinktes Bild auch ohne Auswahl. */
.img-linkbadge {
  position: absolute;
  left: 4px;
  bottom: 4px;
  display: flex;
  height: 18px;
  width: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgb(var(--accent));
  color: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
  pointer-events: none;
}

/* Touch: Skalier-Griff und Knoepfe groesser antippbar machen. */
@media (pointer: coarse) {
  .img-handle {
    right: -11px;
    bottom: -11px;
    width: 24px;
    height: 24px;
    border-radius: 5px;
  }
  .img-del {
    right: -14px;
    top: -14px;
    height: 30px;
    width: 30px;
    font-size: 18px;
  }
  .img-link-btn {
    left: -14px;
    top: -14px;
    height: 30px;
    width: 30px;
  }
}

/*
 * Bildschirm-Modus: der Klick-/Scrollbereich bleibt volle Breite, aber der
 * Textblock wird auf eine angenehme Lesebreite (max. 48rem) zentriert. Dadurch
 * brechen die Zeilen um -- und der Blocksatz wird sichtbar (statt bei voller
 * Fensterbreite in einzeiligen Absaetzen "wirkungslos" zu erscheinen). Das
 * Padding ist der halbe Ueberschuss ueber 48rem, mindestens aber 1,5rem.
 */
.plain-pad {
  padding: 1.25rem max(1.5rem, calc((100% - 48rem) / 2));
}

/* Platzhalter, solange das Feld leer ist. */
.editor-rich:empty::before,
.editor-rich:has(> br:only-child)::before {
  content: attr(data-placeholder);
  color: rgb(161 161 170); /* zinc-400 */
  pointer-events: none;
}

.plain-scroll {
  overflow: auto;
}

.page-backdrop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
  background: rgb(228 228 231); /* zinc-200 */
}
:global(.dark) .page-backdrop {
  background: rgb(9 9 11); /* zinc-950 */
}

.page-canvas {
  position: relative;
  flex: 0 0 auto;
}

.page-sheet {
  position: relative;
  box-sizing: border-box;
  background: #ffffff;
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.18);
  border-radius: 2px;
}
:global(.dark) .page-sheet {
  background: rgb(24 24 27); /* zinc-900 */
}

.page-break-guide {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px dashed rgb(161 161 170); /* zinc-400 */
  pointer-events: none;
}
:global(.dark) .page-break-guide {
  border-top-color: rgb(82 82 91); /* zinc-600 */
}
</style>
