<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import TransformMenu from './TransformMenu.vue'
import type { Transform } from '@/utils/textTransforms'
import type { EditorApi, SelectionFormat } from '@/types'
import { useI18n } from '@/i18n'
import { usePageFormatLabel } from '@/composables/usePageFormatLabel'
import { useToast } from '@/composables/useToast'
import { useAnchoredMenu } from '@/composables/useAnchoredMenu'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { buildHtmlDocument } from '@/utils/exportHtml'
import { htmlToMarkdown } from '@/utils/htmlToMarkdown'
import { safeFileName } from '@/utils/exportPdf'
import { downloadBlob, readFileAsText } from '@/utils/files'

const store = useEditorStore()
const { t } = useI18n()
const { showToast } = useToast()
const pageFormatLabel = usePageFormatLabel()

// Editor-API + Auswahlzustand: fuer "Alles markieren/Auswahl aufheben".
// markdownOpen: hebt den Markdown-Knopf hervor, wenn die Vorschau offen ist.
const props = defineProps<{
  editor: EditorApi | null
  selection: SelectionFormat
  markdownOpen?: boolean
}>()

function newDocument(): void {
  store.newDocument()
  showToast(t.value.toast.newDoc, { key: 'newDoc' })
}

function clearText(): void {
  store.clearActiveDocument()
  showToast(t.value.toast.cleared, { type: 'info', key: 'clear' })
}

const emit = defineEmits<{
  transform: [fn: Transform]
  toggleFind: []
  print: []
  exportPdf: []
  preview: []
  toggleMarkdown: []
  help: []
}>()

/** Leeres Dokument -> "Text loeschen" deaktivieren. */
const isEmpty = computed(() => store.activePlain.trim() === '')

/** Umschalten: alles markieren bzw. Markierung aufheben. */
function toggleSelectAll(): void {
  if (props.selection.allSelected) props.editor?.deselect()
  else props.editor?.selectAll()
}

const fileInput = ref<HTMLInputElement | null>(null)
const imageInput = ref<HTMLInputElement | null>(null)
const backupInput = ref<HTMLInputElement | null>(null)

// Speichern-Menue: haengt an seinem Knopf und liegt per Teleport im <body>,
// damit es in der (auf Mobile horizontal scrollenden) Werkzeugleiste nicht
// abgeschnitten wird.
const {
  open: downloadOpen,
  anchorEl: downloadAnchor,
  menuEl: downloadMenu,
  style: downloadStyle,
  toggle: toggleDownload,
  close: closeDownload,
} = useAnchoredMenu(192)

/* ---------- Bild einfuegen ---------- */
function triggerImage(): void {
  imageInput.value?.click()
}
async function onImageChosen(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !props.editor) return
  const ok = await props.editor.insertImageFile(file)
  if (ok) showToast(t.value.toolbar.imageToast, { key: 'image' })
}

/* ---------- Import ---------- */
function triggerImport(): void {
  fileInput.value?.click()
}
function onFileChosen(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const name = file.name.replace(/\.[^.]+$/, '')
    store.openDocument(name, String(reader.result ?? ''))
    showToast(t.value.toast.opened(name), { key: 'open' })
  }
  reader.readAsText(file)
  input.value = ''
}

/* ---------- Export ---------- */
function download(ext: 'txt' | 'md'): void {
  const doc = store.activeDoc
  if (!doc) return
  // .md: echtes Markdown (Ueberschriften/Fett/Kursiv/Listen bleiben erhalten).
  // .txt: reiner Text.
  const content = ext === 'md' ? htmlToMarkdown(store.activeHtml) : store.activePlain
  const type = ext === 'md' ? 'text/markdown;charset=utf-8' : 'text/plain;charset=utf-8'
  const name = `${safeFileName(store.activeTitle || t.value.doc.untitled)}.${ext}`
  downloadBlob(content, name, type)
  closeDownload()
  showToast(ext === 'md' ? t.value.toast.savedMd : t.value.toast.savedTxt, { key: 'save' })
}

/**
 * HTML-Export: eigenstaendiges Dokument mit derselben Typografie wie
 * Vorschau/PDF -- aber echter, auswaehlbarer Text (kein Rasterbild).
 */
function exportHtml(): void {
  const opts = pageRenderOptions(store.settings, store.activeContent, store.activeImages)
  const html = buildHtmlDocument({
    ...opts,
    title: store.activeTitle || t.value.doc.untitled,
    lang: document.documentElement.lang || 'de',
  })
  downloadBlob(
    html,
    `${safeFileName(store.activeTitle || 'dokument')}.html`,
    'text/html;charset=utf-8',
  )
  closeDownload()
  showToast(t.value.toast.savedHtml, { key: 'save' })
}

function exportPdf(): void {
  closeDownload()
  emit('exportPdf')
}

/* ---------- Sicherung (Backup / Restore) ---------- */
function exportBackup(): void {
  const data = store.exportBackup()
  const date = new Date().toISOString().slice(0, 10)
  downloadBlob(
    JSON.stringify(data, null, 2),
    `kodini-texteditor-sicherung-${date}.json`,
    'application/json',
  )
  closeDownload()
  showToast(t.value.toast.backupSaved(data.documents.length), { key: 'backup' })
}

function triggerRestore(): void {
  closeDownload()
  backupInput.value?.click()
}

async function onBackupChosen(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const n = store.importBackup(JSON.parse(await readFileAsText(file)))
    if (n > 0) showToast(t.value.toast.backupRestored(n), { key: 'backup' })
    else showToast(t.value.toast.backupInvalid, { type: 'error' })
  } catch {
    showToast(t.value.toast.backupInvalid, { type: 'error' })
  }
}

async function copyAll(): Promise<void> {
  try {
    await navigator.clipboard.writeText(store.activePlain)
    showToast(t.value.toast.copied, { key: 'copy' })
  } catch {
    showToast(t.value.toast.copyFailed, { type: 'error' })
  }
}

defineExpose({ download, copyAll, triggerImport })
</script>

<template>
  <div
    class="hbar-scroll flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900"
  >
    <button type="button" class="tb-btn" :title="t.toolbar.newTitle" @click="newDocument">
      {{ t.toolbar.new }}
    </button>
    <button type="button" class="tb-btn" :title="t.toolbar.openTitle" @click="triggerImport">
      {{ t.toolbar.open }}
    </button>
    <button type="button" class="tb-btn" :title="t.toolbar.imageTitle" @click="triggerImage">
      {{ t.toolbar.image }}
    </button>

    <button
      ref="downloadAnchor"
      type="button"
      class="tb-btn"
      :title="t.toolbar.saveTitle"
      :aria-expanded="downloadOpen"
      @click="toggleDownload"
    >
      {{ t.toolbar.save }} ▾
    </button>
    <Teleport to="body">
      <div
        v-if="downloadOpen"
        ref="downloadMenu"
        class="fixed z-50 w-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        :style="downloadStyle"
      >
        <button type="button" class="menu-item" @click="download('txt')">
          {{ t.toolbar.asTxt }}
        </button>
        <button type="button" class="menu-item" @click="download('md')">
          {{ t.toolbar.asMd }}
        </button>
        <button type="button" class="menu-item" @click="exportHtml">
          {{ t.toolbar.asHtml }}
        </button>
        <button type="button" class="menu-item leading-tight" @click="exportPdf">
          {{ t.toolbar.asPdf }}
          <span class="block text-xs text-zinc-400">{{ pageFormatLabel }}</span>
        </button>

        <div class="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />

        <button type="button" class="menu-item leading-tight" @click="exportBackup">
          {{ t.toolbar.backupSave }}
          <span class="block text-xs text-zinc-400">{{ t.toolbar.backupSaveHint }}</span>
        </button>
        <button type="button" class="menu-item leading-tight" @click="triggerRestore">
          {{ t.toolbar.backupRestore }}
          <span class="block text-xs text-zinc-400">{{ t.toolbar.backupRestoreHint }}</span>
        </button>
      </div>
    </Teleport>

    <button
      type="button"
      class="tb-btn"
      :class="selection.allSelected ? 'text-accent' : ''"
      :title="selection.allSelected ? t.toolbar.deselectTitle : t.toolbar.selectAllTitle"
      :aria-pressed="selection.allSelected"
      @mousedown.prevent
      @click="toggleSelectAll"
    >
      {{ selection.allSelected ? t.toolbar.deselect : t.toolbar.selectAll }}
    </button>

    <button type="button" class="tb-btn" :title="t.toolbar.copyTitle" @click="copyAll">
      {{ t.toolbar.copy }}
    </button>

    <button
      type="button"
      class="tb-btn text-red-600 disabled:text-zinc-400 dark:text-red-400"
      :disabled="isEmpty"
      :title="t.toolbar.clearTitle"
      @click="clearText"
    >
      {{ t.toolbar.clear }}
    </button>

    <button
      type="button"
      class="tb-btn"
      :title="`${t.toolbar.print} · ${pageFormatLabel}`"
      @click="emit('print')"
    >
      {{ t.toolbar.print }}
    </button>

    <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

    <button
      type="button"
      class="tb-btn"
      :disabled="!store.canUndo"
      :title="t.toolbar.undoTitle"
      @click="store.undo()"
    >
      ↶
    </button>
    <button
      type="button"
      class="tb-btn"
      :disabled="!store.canRedo"
      :title="t.toolbar.redoTitle"
      @click="store.redo()"
    >
      ↷
    </button>

    <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

    <TransformMenu @apply="(fn: Transform) => emit('transform', fn)" />
    <button type="button" class="tb-btn" :title="t.toolbar.findTitle" @click="emit('toggleFind')">
      {{ t.toolbar.find }}
    </button>

    <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

    <button type="button" class="tb-btn" :title="t.toolbar.previewTitle" @click="emit('preview')">
      {{ t.toolbar.preview }}
    </button>
    <button
      type="button"
      class="tb-btn"
      :class="props.markdownOpen ? 'text-accent' : ''"
      :title="t.toolbar.markdownTitle"
      :aria-pressed="props.markdownOpen"
      @click="emit('toggleMarkdown')"
    >
      {{ t.toolbar.markdown }}
    </button>
    <button
      type="button"
      class="tb-btn"
      :class="store.settings.focusMode ? 'text-accent' : ''"
      :title="t.toolbar.focusTitle"
      @click="store.updateSettings({ focusMode: !store.settings.focusMode })"
    >
      {{ t.toolbar.focus }}
    </button>

    <button
      type="button"
      class="tb-btn"
      :title="t.toolbar.shortcutsTitle"
      :aria-label="t.toolbar.shortcutsTitle"
      @click="emit('help')"
    >
      <svg viewBox="0 0 20 14" class="h-4 w-6" fill="none" aria-hidden="true">
        <rect
          x="0.7"
          y="0.7"
          width="18.6"
          height="12.6"
          rx="2"
          stroke="currentColor"
          stroke-width="1.2"
        />
        <path
          d="M4 4h0M7 4h0M10 4h0M13 4h0M16 4h0M4 7h0M7 7h0M10 7h0M13 7h0M16 7h0M6 10h8"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    </button>

    <input
      ref="fileInput"
      type="file"
      accept=".txt,.md,.markdown,text/*"
      class="hidden"
      @change="onFileChosen"
    />
    <input
      ref="imageInput"
      type="file"
      accept="image/png,image/jpeg,image/gif,image/webp"
      class="hidden"
      @change="onImageChosen"
    />
    <input
      ref="backupInput"
      type="file"
      accept=".json,application/json"
      class="hidden"
      @change="onBackupChosen"
    />
  </div>
</template>

<style scoped>
.tb-btn {
  @apply rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-200 dark:hover:bg-zinc-800;
}
.menu-item {
  @apply block w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-700;
}
</style>
