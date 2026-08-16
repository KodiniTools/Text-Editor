<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useI18n } from '@/i18n'
import { pageSizeCss } from '@/utils/pageFormats'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { exportPdf } from '@/utils/exportPdf'
import { loadFont, findFont } from '@/config/fonts'
import { useToast } from '@/composables/useToast'
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
const { showToast } = useToast()

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
  allSelected: false,
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
  // Marker im Hash: die Vorschau erkennt daran, dass sie vom Editor geoeffnet
  // wurde, und schliesst sich beim "Zum Editor" (statt einen frischen Editor
  // ohne Undo-Historie zu laden).
  const win = window.open(`${import.meta.env.BASE_URL}preview#from=editor`, '_blank', 'noopener')
  if (win === null) showToast(t.value.toast.previewBlocked, { type: 'error' })
  else showToast(t.value.toast.previewOpened, { key: 'preview' })
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
  nextTick(() => {
    showToast(t.value.toast.printing, { type: 'info', key: 'print' })
    window.print()
  })
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
      ...pageRenderOptions(store.settings, store.activeContent, store.activeImages),
      fileName: store.activeTitle || 'dokument',
    })
    showToast(t.value.toast.pdfDone, { key: 'pdf' })
  } catch {
    showToast(t.value.toast.pdfFailed, { type: 'error' })
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
    } else if (store.settings.focusMode) {
      // Fokus-Modus mit Esc verlassen -- der Editor-Zustand bleibt vollstaendig
      // erhalten (Dokumente, Einstellungen, Undo/Redo-Historie).
      store.updateSettings({ focusMode: false })
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
  <div
    class="relative flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100"
  >
    <!-- Nur fuer Suchmaschinen/Screenreader: eine eindeutige Ueberschrift und
         Kurzbeschreibung der Seite (visuell ausgeblendet). -->
    <h1 class="sr-only">{{ t.seo.heading }}</h1>
    <p class="sr-only">{{ t.seo.tagline }}</p>

    <template v-if="!store.settings.focusMode">
      <DocumentTabs />
      <EditorToolbar
        ref="toolbarRef"
        :editor="editorApi"
        :selection="selFormat"
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

    <!--
      Fokus verlassen: bewusst ABSOLUTE innerhalb des Editorbereichs (nicht fixed
      zum Viewport), damit der Knopf UNTER der globalen, klebrigen Navigation
      sitzt und nicht von ihr verdeckt wird. Zusaetzlich beendet Esc den Fokus.
    -->
    <button
      v-if="store.settings.focusMode"
      type="button"
      class="absolute right-4 top-4 z-40 inline-flex items-center gap-2 rounded-full bg-zinc-800/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur hover:bg-zinc-700"
      :title="`${t.focusOverlay.exit} (Esc)`"
      @click="store.updateSettings({ focusMode: false })"
    >
      <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
        <path
          d="M4 4l8 8M12 4l-8 8"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
      {{ t.focusOverlay.exit }}
      <span class="rounded bg-white/20 px-1.5 py-0.5 text-xs">Esc</span>
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
