<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { Transform } from '@/utils/textTransforms'
import { buildSearchRegex, countMatches as countInText, type FindOptions } from '@/utils/find'
import { pageDimensions } from '@/utils/pageFormats'
import { DEFAULT_MARGIN_MM, mmToPx, lineStepPx, paginateByLines } from '@/utils/renderPages'
import { useI18n } from '@/i18n'

const store = useEditorStore()
const { t } = useI18n()

const emit = defineEmits<{
  cursor: [line: number, col: number]
}>()

const textarea = ref<HTMLTextAreaElement | null>(null)

const content = computed<string>({
  get: () => store.activeContent,
  set: (v) => store.updateContent(v),
})

/**
 * Schrift, Groesse, Zeilenhoehe, Laufweite, Ausrichtung und Farbe kommen als
 * CSS-Variablen von useTheme -- hier bleibt nur der Zeilenumbruch, der kein
 * sinnvolles Gegenstueck als Variable hat.
 */
const editorStyle = computed(() => ({
  whiteSpace: store.settings.wordWrap ? ('pre-wrap' as const) : ('pre' as const),
}))

/* ---------- Seiten-Ansicht (A4/A3/...) ---------- */
/**
 * In der Seiten-Ansicht ist das Textfeld exakt so breit wie der Textbereich der
 * Exportseite (Papierbreite minus Rand, in px bei 96 dpi). Bei identischer
 * Schriftgroesse, Laufweite und Umbruch-Regel bricht der Editor damit an genau
 * denselben Stellen um wie die spaeter gespeicherte/gedruckte Datei. Der
 * Zoom-Regler skaliert nur die Darstellung (CSS-Transform) und aendert den
 * Umbruch nicht.
 */
const host = ref<HTMLElement | null>(null)
const textHeight = ref(0)

const pageActive = computed(() => store.settings.pageFormat !== 'none')
const zoom = computed(() => store.settings.pageZoom)

/** Seitenmasse in px (96 dpi) -- dieselbe Umrechnung wie im Export. */
const metrics = computed(() => {
  const dims = pageDimensions(store.settings.pageFormat, store.settings.pageOrientation)
  if (!dims) return null
  const pageW = Math.round(mmToPx(dims.widthMm))
  const pageH = Math.round(mmToPx(dims.heightMm))
  const margin = Math.round(mmToPx(DEFAULT_MARGIN_MM))
  return { pageW, pageH, margin, contentW: pageW - 2 * margin, contentH: pageH - 2 * margin }
})

/** Blatthoehe = Rand oben/unten + mitwachsende Texthoehe (mind. eine Seite). */
const sheetHeight = computed(() => {
  const m = metrics.value
  if (!m) return 0
  return 2 * m.margin + Math.max(m.contentH, textHeight.value)
})

/** Aeussere (skalierte) Masse -- damit der graue Bereich korrekt scrollt. */
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
  pageActive.value ? { height: `${textHeight.value}px` } : undefined,
)

/** Fuehrungslinien dort, wo im Export eine neue Seite beginnt (an Zeilengrenzen,
 *  genau wie die Vorschau/der Export -- siehe paginateByLines). */
const pageBreaks = computed<number[]>(() => {
  const m = metrics.value
  if (!m || !pageActive.value) return []
  const step = lineStepPx(store.settings.fontSize, store.settings.lineHeight)
  const { pageStepPx, count } = paginateByLines(
    Math.max(m.contentH, textHeight.value),
    m.contentH,
    step,
  )
  const lines: number[] = []
  for (let k = 1; k < count; k++) lines.push(m.margin + k * pageStepPx)
  return lines
})

/** Textfeldhoehe an den Inhalt anpassen (Textareas wachsen nicht von selbst). */
function syncHeight(): void {
  const el = textarea.value
  if (!el || !pageActive.value) return
  el.style.height = 'auto'
  textHeight.value = el.scrollHeight
  el.style.height = `${el.scrollHeight}px`
}

onMounted(() => nextTick(syncHeight))
watch(content, () => nextTick(syncHeight))
watch(
  () => [
    pageActive.value,
    metrics.value?.contentW,
    store.settings.fontSize,
    store.settings.lineHeight,
    store.settings.letterSpacing,
    store.settings.fontFamily,
    store.settings.wordWrap,
  ],
  () => nextTick(syncHeight),
)

/* ---------- Cursor-Position ---------- */
function reportCursor(): void {
  const el = textarea.value
  if (!el) return
  const pos = el.selectionStart
  const before = el.value.slice(0, pos)
  const line = before.split('\n').length
  const col = pos - before.lastIndexOf('\n')
  emit('cursor', line, col)
}

/* ---------- Tab-Handling: 2 Leerzeichen einfuegen ---------- */
function onTab(e: KeyboardEvent): void {
  e.preventDefault()
  insertAtSelection('  ')
}

function insertAtSelection(text: string): void {
  const el = textarea.value
  if (!el) return
  const { selectionStart: a, selectionEnd: b, value } = el
  const next = value.slice(0, a) + text + value.slice(b)
  store.updateContent(next)
  nextTick(() => {
    if (!textarea.value) return
    const caret = a + text.length
    textarea.value.selectionStart = textarea.value.selectionEnd = caret
    textarea.value.focus()
    reportCursor()
  })
}

/* ---------- Exposed: Transform auf Auswahl oder Gesamttext ---------- */
function applyTransform(fn: Transform): void {
  const el = textarea.value
  if (!el) return
  const { selectionStart: a, selectionEnd: b, value } = el
  if (a !== b) {
    const next = value.slice(0, a) + fn(value.slice(a, b)) + value.slice(b)
    store.replaceContent(next)
  } else {
    store.replaceContent(fn(value))
  }
  nextTick(reportCursor)
}

function focusEditor(): void {
  textarea.value?.focus()
}

function insertText(text: string): void {
  insertAtSelection(text)
}

/* ---------- Exposed: Suchen & Ersetzen ---------- */
function selectRange(start: number, end: number): void {
  const el = textarea.value
  if (!el) return
  el.focus()
  el.selectionStart = start
  el.selectionEnd = end
  // Sichtbar scrollen
  const before = el.value.slice(0, start)
  const lineIndex = before.split('\n').length - 1
  const lineHeight = store.settings.fontSize * store.settings.lineHeight
  el.scrollTop = Math.max(0, lineIndex * lineHeight - el.clientHeight / 2)
  reportCursor()
}

function findNext(query: string, opts: FindOptions): boolean {
  const el = textarea.value
  if (!el) return false
  const re = buildSearchRegex(query, opts, true)
  if (!re) return false
  re.lastIndex = el.selectionEnd
  let m = re.exec(el.value)
  if (!m) {
    re.lastIndex = 0
    m = re.exec(el.value)
  }
  if (!m) return false
  selectRange(m.index, m.index + m[0].length)
  return true
}

function findPrev(query: string, opts: FindOptions): boolean {
  const el = textarea.value
  if (!el) return false
  const re = buildSearchRegex(query, opts, true)
  if (!re) return false
  const limit = el.selectionStart
  let last: RegExpExecArray | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(el.value)) !== null) {
    if (m.index < limit) last = m
    else break
    if (m[0] === '') re.lastIndex++
  }
  if (!last) {
    // Von hinten suchen (wrap)
    re.lastIndex = 0
    while ((m = re.exec(el.value)) !== null) {
      last = m
      if (m[0] === '') re.lastIndex++
    }
  }
  if (!last) return false
  selectRange(last.index, last.index + last[0].length)
  return true
}

function replaceCurrent(query: string, replacement: string, opts: FindOptions): boolean {
  const el = textarea.value
  if (!el) return false
  const selected = el.value.slice(el.selectionStart, el.selectionEnd)
  const re = buildSearchRegex(query, opts, false)
  if (!re || selected === '' || !re.test(selected)) {
    return findNext(query, opts)
  }
  const start = el.selectionStart
  const next = el.value.slice(0, start) + replacement + el.value.slice(el.selectionEnd)
  store.replaceContent(next)
  nextTick(() => {
    selectRange(start + replacement.length, start + replacement.length)
    findNext(query, opts)
  })
  return true
}

function replaceAll(query: string, replacement: string, opts: FindOptions): number {
  const el = textarea.value
  if (!el) return 0
  const re = buildSearchRegex(query, opts, true)
  if (!re) return 0
  const count = (el.value.match(re) ?? []).length
  if (count === 0) return 0
  store.replaceContent(el.value.replace(re, replacement))
  return count
}

function countMatches(query: string, opts: FindOptions): number {
  return countInText(store.activeContent, query, opts)
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
})
</script>

<template>
  <div ref="host" :class="pageActive ? 'page-backdrop' : 'flex h-full min-h-0 w-full'">
    <!-- Aeusserer Rahmen: haelt (in der Seiten-Ansicht) die skalierte Groesse,
         damit der graue Bereich korrekt scrollt. -->
    <div :class="pageActive ? 'page-canvas' : 'flex h-full min-h-0 w-full'" :style="canvasStyle">
      <div :class="pageActive ? 'page-sheet' : 'flex h-full min-h-0 w-full'" :style="sheetStyle">
        <!-- Seitenumbruch-Markierungen an den Stellen der Export-Seiten. -->
        <div
          v-for="(y, i) in pageBreaks"
          :key="i"
          class="page-break-guide"
          :style="{ top: `${y}px` }"
          aria-hidden="true"
        />
        <textarea
          ref="textarea"
          v-model="content"
          class="editor-text resize-none bg-transparent outline-none placeholder:text-zinc-400"
          :class="
            pageActive ? 'relative block w-full overflow-hidden' : 'min-h-0 w-full flex-1 px-6 py-5'
          "
          :style="[editorStyle, textStyle]"
          spellcheck="true"
          :placeholder="t.editor.placeholder"
          @keydown.tab="onTab"
          @keyup="reportCursor"
          @click="reportCursor"
          @select="reportCursor"
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
  /* Ohne eigene Textfarbe greift der Wert aus den Tailwind-Klassen. */
  color: var(--editor-color, inherit);
  /* Umbruch-Regeln wie im Export (renderPages), damit die Zeilen an denselben
     Stellen brechen. */
  overflow-wrap: break-word;
  word-break: normal;
}

/* Grauer Hintergrund, auf dem das Blatt schwebt (oben ausgerichtet, damit lange
   Dokumente von oben nach unten gescrollt werden). */
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

/* Aeusserer Rahmen: nimmt die skalierte Groesse ein, damit korrekt gescrollt
   wird (der Zoom skaliert das Blatt per CSS-Transform). */
.page-canvas {
  position: relative;
  flex: 0 0 auto;
}

/* Das "Blatt": weiss/dunkel je Theme, mit Schatten. Breite = echte Seitenbreite;
   die Hoehe waechst mit dem Inhalt. */
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

/* Markierung, wo im Export eine neue Seite beginnt. */
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
