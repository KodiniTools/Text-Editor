<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { Transform } from '@/utils/textTransforms'
import { buildSearchRegex, countMatches as countInText, type FindOptions } from '@/utils/find'
import { pageAspect } from '@/utils/pageFormats'
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
const host = ref<HTMLElement | null>(null)
const sheetSize = ref<{ w: number; h: number } | null>(null)

const pageActive = computed(() => store.settings.pageFormat !== 'none')
const aspect = computed(() => pageAspect(store.settings.pageFormat, store.settings.pageOrientation))

/**
 * Blattgroesse in px, so dass die Seite mit korrektem Seitenverhaeltnis in den
 * verfuegbaren Bereich passt (fuer Hoch- wie Querformat). Ueber einen
 * ResizeObserver an die Fenstergroesse gekoppelt.
 */
function recomputeSheet(): void {
  if (!pageActive.value || !host.value || !aspect.value) {
    sheetSize.value = null
    return
  }
  const pad = 32 // Rand des grauen Hintergrunds (1rem je Seite)
  const availW = host.value.clientWidth - pad
  const availH = host.value.clientHeight - pad
  if (availW <= 0 || availH <= 0) return
  const a = aspect.value
  let w: number
  let h: number
  if (availW / availH > a) {
    h = availH
    w = h * a
  } else {
    w = availW
    h = w / a
  }
  sheetSize.value = { w: Math.max(80, Math.floor(w)), h: Math.max(80, Math.floor(h)) }
}

const sheetStyle = computed(() =>
  sheetSize.value ? { width: `${sheetSize.value.w}px`, height: `${sheetSize.value.h}px` } : {},
)

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(recomputeSheet)
    if (host.value) resizeObserver.observe(host.value)
  }
  recomputeSheet()
})
onBeforeUnmount(() => resizeObserver?.disconnect())
watch([pageActive, aspect], () => nextTick(recomputeSheet))

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
  <div ref="host" class="flex h-full min-h-0 w-full" :class="pageActive ? 'page-backdrop' : ''">
    <div
      class="flex min-h-0"
      :class="pageActive ? 'page-sheet' : 'h-full w-full'"
      :style="pageActive ? sheetStyle : undefined"
    >
      <textarea
        ref="textarea"
        v-model="content"
        class="editor-text min-h-0 w-full flex-1 resize-none bg-transparent px-6 py-5 outline-none placeholder:text-zinc-400"
        :style="editorStyle"
        spellcheck="true"
        :placeholder="t.editor.placeholder"
        @keydown.tab="onTab"
        @keyup="reportCursor"
        @click="reportCursor"
        @select="reportCursor"
      />
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
}

/* Grauer Hintergrund, auf dem das Blatt zentriert schwebt. */
.page-backdrop {
  align-items: center;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
  background: rgb(228 228 231); /* zinc-200 */
}
:global(.dark) .page-backdrop {
  background: rgb(9 9 11); /* zinc-950 */
}

/* Das "Blatt": weiss/dunkel je Theme, mit Schatten. Groesse kommt aus dem Style. */
.page-sheet {
  flex: 0 0 auto;
  background: #ffffff;
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.18);
  border-radius: 2px;
  overflow: hidden;
}
:global(.dark) .page-sheet {
  background: rgb(24 24 27); /* zinc-900 */
}
</style>
