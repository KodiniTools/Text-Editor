<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useFileDrop } from '@/composables/useFileDrop'
import { useI18n } from '@/i18n'
import { pageSizeCss } from '@/utils/pageFormats'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { exportPdf } from '@/utils/exportPdf'
import { isBackupFile, isImageFile, isTextFile, readFileAsText } from '@/utils/files'
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
import ShortcutHelp from '@/components/ShortcutHelp.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import { LIMITS } from '@/stores/editor'

const store = useEditorStore()
const { t } = useI18n()
const { showToast } = useToast()

const editorAreaRef = ref<InstanceType<typeof EditorArea> | null>(null)
const findRef = ref<InstanceType<typeof FindReplace> | null>(null)
const toolbarRef = ref<InstanceType<typeof EditorToolbar> | null>(null)

const editorApi = computed<EditorApi | null>(() => editorAreaRef.value)

const showFind = ref(false)
const showHelp = ref(false)
const showMarkdown = ref(false)
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
  block: 'p',
  bulletList: false,
  numberedList: false,
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

/* ---------- Shortcut-Helfer (Turbo-Nutzer) ---------- */
/** Weiter-/Rueckwaerts-Suchen per Tastatur: Suche oeffnen, sonst direkt springen. */
function findNextShortcut(): void {
  if (showFind.value) findRef.value?.next()
  else openFind()
}
function findPrevShortcut(): void {
  if (showFind.value) findRef.value?.prev()
  else openFind()
}

/** Zu Dokument n springen (1..8 = Position, 9 = letztes). */
function switchToDocument(n: number): void {
  const docs = store.documents
  const idx = n >= 9 ? docs.length - 1 : n - 1
  const doc = docs[idx]
  if (doc) store.switchDocument(doc.id)
}

/** Schriftgroesse per Tastatur aendern (Store begrenzt auf den gueltigen Bereich). */
function nudgeFontSize(delta: number): void {
  store.updateSettings({ fontSize: store.settings.fontSize + delta * LIMITS.fontSize.step })
}

function toggleFocus(): void {
  store.updateSettings({ focusMode: !store.settings.focusMode })
}

function toggleHelp(): void {
  showHelp.value = !showHelp.value
}

/* ---------- Drag & Drop (Datei ins Fenster ziehen) ---------- */
/**
 * Verteilt abgelegte Dateien: Bilder ins Dokument, `.json`-Sicherungen
 * wiederherstellen, Text (.txt/.md/...) als neues Dokument oeffnen.
 */
async function handleDroppedFiles(files: File[]): Promise<void> {
  for (const file of files) {
    if (isImageFile(file)) {
      const ok = await editorApi.value?.insertImageFile(file)
      if (ok) showToast(t.value.toolbar.imageToast, { key: 'image' })
    } else if (isBackupFile(file)) {
      try {
        const n = store.importBackup(JSON.parse(await readFileAsText(file)))
        if (n > 0) showToast(t.value.toast.backupRestored(n), { key: 'backup' })
        else showToast(t.value.toast.backupInvalid, { type: 'error' })
      } catch {
        showToast(t.value.toast.backupInvalid, { type: 'error' })
      }
    } else if (isTextFile(file)) {
      const name = file.name.replace(/\.[^.]+$/, '')
      store.openDocument(name, await readFileAsText(file))
      showToast(t.value.toast.opened(name), { key: 'open' })
    }
  }
}

const { active: dropActive } = useFileDrop(handleDroppedFiles)

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
  // Datei & Dokumente
  'mod+m': () => store.newDocument(),
  'mod+o': () => toolbarRef.value?.triggerImport(),
  'mod+s': () => toolbarRef.value?.download('txt'),
  'mod+shift+s': exportPdfDocument,
  'mod+p': printDocument,
  'alt+1': () => switchToDocument(1),
  'alt+2': () => switchToDocument(2),
  'alt+3': () => switchToDocument(3),
  'alt+4': () => switchToDocument(4),
  'alt+5': () => switchToDocument(5),
  'alt+6': () => switchToDocument(6),
  'alt+7': () => switchToDocument(7),
  'alt+8': () => switchToDocument(8),
  'alt+9': () => switchToDocument(9),

  // Bearbeiten & Suchen
  'mod+z': () => store.undo(),
  'mod+y': () => store.redo(),
  'mod+shift+z': () => store.redo(),
  'mod+f': openFind,
  'mod+g': findNextShortcut,
  'mod+shift+g': findPrevShortcut,

  // Format
  'mod+b': () => editorApi.value?.toggleBold(),
  'mod+i': () => editorApi.value?.toggleItalic(),
  'mod+\\': () => editorApi.value?.clearFormatting(),
  'mod+shift+.': () => nudgeFontSize(1),
  'mod+shift+,': () => nudgeFontSize(-1),

  // Absaetze & Listen
  'mod+alt+0': () => editorApi.value?.setBlock('p'),
  'mod+alt+1': () => editorApi.value?.setBlock('h1'),
  'mod+alt+2': () => editorApi.value?.setBlock('h2'),
  'mod+alt+3': () => editorApi.value?.setBlock('h3'),
  'mod+shift+8': () => editorApi.value?.toggleBulletList(),
  'mod+shift+7': () => editorApi.value?.toggleNumberedList(),

  // Ansicht
  'mod+shift+f': toggleFocus,
  'mod+/': toggleHelp,
  f1: toggleHelp,
  esc: () => {
    if (showHelp.value) {
      showHelp.value = false
    } else if (showFind.value) {
      showFind.value = false
      editorApi.value?.focusEditor()
    } else if (store.settings.focusMode) {
      // Fokus-Modus mit Esc verlassen -- der Editor-Zustand bleibt vollstaendig
      // erhalten (Dokumente, Einstellungen, Undo/Redo-Historie).
      store.updateSettings({ focusMode: false })
    }
  },
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
        :markdown-open="showMarkdown"
        @transform="onTransform"
        @toggle-find="toggleFind"
        @print="printDocument"
        @export-pdf="exportPdfDocument"
        @preview="openPreview"
        @toggle-markdown="showMarkdown = !showMarkdown"
        @help="showHelp = true"
      />
      <FormatBar :editor="editorApi" :selection="selFormat" />
    </template>

    <FindReplace v-if="showFind" ref="findRef" :editor="editorApi" @close="toggleFind" />

    <ShortcutHelp v-if="showHelp" @close="showHelp = false" />

    <div class="flex min-h-0 flex-1 flex-col md:flex-row">
      <div class="min-h-0 min-w-0 flex-1">
        <EditorArea
          ref="editorAreaRef"
          class="h-full"
          @cursor="onCursor"
          @selchange="onSelFormat"
        />
      </div>
      <!-- Markdown-Live-Vorschau: auf schmalen Schirmen unter dem Editor,
           ab md nebeneinander (je halbe Breite). -->
      <MarkdownPreview
        v-if="showMarkdown"
        class="min-h-0 min-w-0 flex-1 border-t border-zinc-200 md:border-l md:border-t-0 dark:border-zinc-800"
        @close="showMarkdown = false"
      />
    </div>

    <StatusBar v-if="!store.settings.focusMode" :cursor-line="cursorLine" :cursor-col="cursorCol" />

    <!--
      Ablage-Ueberlagerung fuer Drag & Drop. pointer-events-none, damit sie die
      Drop-Erkennung (auf window) nicht stoert -- rein visuell.
    -->
    <div
      v-if="dropActive"
      class="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-accent/10 p-6 backdrop-blur-sm"
    >
      <div
        class="rounded-2xl border-2 border-dashed border-accent bg-white/90 px-8 py-6 text-center shadow-xl dark:bg-zinc-900/90"
      >
        <svg viewBox="0 0 24 24" class="mx-auto mb-2 h-9 w-9 text-accent" aria-hidden="true">
          <path
            d="M12 16V4m0 0L7 9m5-5l5 5M5 17v2a1 1 0 001 1h12a1 1 0 001-1v-2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <p class="text-lg font-semibold text-zinc-800 dark:text-zinc-100">{{ t.drop.title }}</p>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{{ t.drop.hint }}</p>
      </div>
    </div>

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
