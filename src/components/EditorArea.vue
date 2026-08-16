<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { Transform } from '@/utils/textTransforms'
import type { SelectionFormat } from '@/types'
import { buildSearchRegex, countMatches as countInText, type FindOptions } from '@/utils/find'
import { pageDimensions } from '@/utils/pageFormats'
import { DEFAULT_MARGIN_MM, mmToPx, lineStepPx, paginateByLines } from '@/utils/renderPages'
import { htmlToPlain, plainToHtml, sanitizeHtml } from '@/utils/richText'
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
  let allSelected = false
  if (inside) {
    try {
      bold = document.queryCommandState('bold')
      italic = document.queryCommandState('italic')
    } catch {
      /* queryCommandState evtl. nicht verfuegbar */
    }
    if (el && sel && !collapsed) {
      const full = document.createRange()
      full.selectNodeContents(el)
      const r = sel.getRangeAt(0)
      allSelected =
        r.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
        r.compareBoundaryPoints(Range.END_TO_END, full) >= 0
    }
  }
  emit('selchange', { hasSelection: inside && !collapsed, allSelected, bold, italic, color: '' })
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
  if (!sel.isCollapsed) savedRange = range.cloneRange()
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
    document.execCommand('removeFormat')
  } finally {
    suppressInput = false
  }
  if (!hadSelection) window.getSelection()?.removeAllRanges()
  commitDiscrete()
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
  clearFormatting,
  selectAll,
  deselect,
})
</script>

<template>
  <div ref="host" :class="pageActive ? 'page-backdrop' : 'plain-scroll flex h-full min-h-0 w-full'">
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
          @paste="onPaste"
        />
      </div>
    </div>
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
