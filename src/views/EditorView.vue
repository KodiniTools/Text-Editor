<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useI18n } from '@/i18n'
import { pageSizeCss } from '@/utils/pageFormats'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { exportPdf } from '@/utils/exportPdf'
import { loadFont, findFont } from '@/config/fonts'
import type { EditorApi, SelectionFormat } from '@/types'
import type { Transform } from '@/utils/textTransforms'

import DocumentTabs from '@/components/DocumentTabs.vue'
import EditorToolbar from '@/components/EditorToolbar.vue'
import FormatBar from '@/components/FormatBar.vue'
import EditorArea from '@/components/EditorArea.vue'
import FindReplace from '@/components/FindReplace.vue'
import StatusBar from '@/components/StatusBar.vue'

const store = useEditorStore()
const { t } = useI18n()

const editorAreaRef = ref<InstanceType<typeof EditorArea> | null>(null)
const findRef = ref<InstanceType<typeof FindReplace> | null>(null)
const toolbarRef = ref<InstanceType<typeof EditorToolbar> | null>(null)

const editorApi = computed<EditorApi | null>(() => editorAreaRef.value)

const showFind = ref(false)
const cursorLine = ref(1)
const cursorCol = ref(1)

// Aktueller Formatzustand der Auswahl -- fuer die Fett/Kursiv-Knoepfe und die
// Entscheidung, ob Farbe auf die Auswahl oder das ganze Dokument wirkt.
const selFormat = ref<SelectionFormat>({
  hasSelection: false,
  bold: false,
  italic: false,
  color: '',
})
function onSelFormat(state: SelectionFormat): void {
  selFormat.value = state
}

function onTransform(fn: Transform): void {
  editorApi.value?.applyTransform(fn)
}

function onCursor(line: number, col: number): void {
  cursorLine.value = line
  cursorCol.value = col
}

function openFind(): void {
  showFind.value = true
  nextTick(() => findRef.value?.focus())
}

function toggleFind(): void {
  if (showFind.value) {
    showFind.value = false
    editorApi.value?.focusEditor()
  } else {
    openFind()
  }
}

/* ---------- Vorschau in neuem Tab ---------- */
/**
 * Oeffnet die exakte Vorschau in einem eigenen Tab. Vorher den aktuellen Stand
 * in den localStorage schreiben, damit der neue Tab (eigene App-Instanz) ihn
 * beim Start liest.
 */
function openPreview(): void {
  store.persistNow()
  window.open(`${import.meta.env.BASE_URL}preview`, '_blank', 'noopener')
}

/* ---------- Drucken / Als PDF ---------- */
// Bereinigtes HTML der aktiven Seite (inkl. Inline-Fett/Kursiv/Farbe) -- nur im
// Druck sichtbar.
const printHtml = computed(() => store.activeHtml)

/**
 * Haelt die `@page`-Regel (Papiergroesse + Ausrichtung) im Kopf des Dokuments
 * aktuell, damit sowohl "Als PDF" als auch Strg+P im gewaehlten Format drucken.
 * Ohne gewaehltes Format faellt pageSizeCss auf A4 Hochformat zurueck.
 */
let pageStyleEl: HTMLStyleElement | null = null
function syncPageStyle(): void {
  if (typeof document === 'undefined') return
  if (!pageStyleEl) {
    pageStyleEl = document.createElement('style')
    pageStyleEl.id = 'kodini-page-size'
    document.head.appendChild(pageStyleEl)
  }
  const size = pageSizeCss(store.settings.pageFormat, store.settings.pageOrientation)
  pageStyleEl.textContent = `@page { size: ${size}; margin: 18mm; }`
}

function printDocument(): void {
  syncPageStyle()
  // Warten, bis der Druckinhalt im DOM steht, dann den Druckdialog oeffnen.
  nextTick(() => window.print())
}

/* ---------- Ein-Klick-PDF ---------- */
const exporting = ref(false)
async function exportPdfDocument(): Promise<void> {
  if (exporting.value) return
  exporting.value = true
  try {
    // Schrift vor dem Rastern sicher laden, sonst faellt der Export auf eine
    // Ersatzschrift zurueck.
    await loadFont(findFont(store.settings.fontFamily))
    await exportPdf({
      ...pageRenderOptions(store.settings, store.activeContent),
      fileName: store.activeDoc?.name || 'dokument',
    })
  } finally {
    exporting.value = false
  }
}

onMounted(syncPageStyle)
onBeforeUnmount(() => pageStyleEl?.remove())
watch(() => [store.settings.pageFormat, store.settings.pageOrientation], syncPageStyle)

useKeyboardShortcuts({
  'mod+f': openFind,
  esc: () => {
    if (showFind.value) {
      showFind.value = false
      editorApi.value?.focusEditor()
    }
  },
  'mod+m': () => store.newDocument(),
  'mod+z': () => store.undo(),
  'mod+y': () => store.redo(),
  'mod+shift+z': () => store.redo(),
  'mod+s': () => toolbarRef.value?.download('txt'),
  'mod+p': printDocument,
  'mod+b': () => editorApi.value?.toggleBold(),
  'mod+i': () => editorApi.value?.toggleItalic(),
})
</script>

<template>
  <div class="flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <template v-if="!store.settings.focusMode">
      <DocumentTabs />
      <EditorToolbar
        ref="toolbarRef"
        @transform="onTransform"
        @toggle-find="toggleFind"
        @print="printDocument"
        @export-pdf="exportPdfDocument"
        @preview="openPreview"
      />
      <FormatBar :editor="editorApi" :selection="selFormat" />
    </template>

    <FindReplace v-if="showFind" ref="findRef" :editor="editorApi" @close="toggleFind" />

    <div class="flex min-h-0 flex-1">
      <div class="min-w-0 flex-1">
        <EditorArea
          ref="editorAreaRef"
          class="h-full"
          @cursor="onCursor"
          @selchange="onSelFormat"
        />
      </div>
    </div>

    <StatusBar v-if="!store.settings.focusMode" :cursor-line="cursorLine" :cursor-col="cursorCol" />

    <button
      v-if="store.settings.focusMode"
      type="button"
      class="fixed right-4 top-4 z-30 rounded-full bg-zinc-800/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur hover:bg-zinc-700"
      @click="store.updateSettings({ focusMode: false })"
    >
      {{ t.focusOverlay.exit }}
    </button>

    <!--
      Druck-/PDF-Ausgabe: am Bildschirm ausgeblendet, beim Drucken das einzig
      Sichtbare. Nutzt dieselben --editor-*-Variablen wie der Editor, damit
      Schrift, Groesse, Zeilenabstand, Laufweite und Ausrichtung mitgedruckt
      werden. Die Papiergroesse steuert die @page-Regel (siehe syncPageStyle).
    -->
    <!-- eslint-disable-next-line vue/no-v-html -- Inhalt ist bereits bereinigt (store.activeHtml) -->
    <div id="print-root" aria-hidden="true" v-html="printHtml" />
  </div>
</template>
