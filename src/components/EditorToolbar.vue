<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import TransformMenu from './TransformMenu.vue'
import type { Transform } from '@/utils/textTransforms'
import type { EditorApi, SelectionFormat } from '@/types'
import { useI18n } from '@/i18n'
import { usePageFormatLabel } from '@/composables/usePageFormatLabel'

const store = useEditorStore()
const { t } = useI18n()
const pageFormatLabel = usePageFormatLabel()

// Editor-API + Auswahlzustand: fuer "Alles markieren/Auswahl aufheben".
const props = defineProps<{ editor: EditorApi | null; selection: SelectionFormat }>()

const emit = defineEmits<{
  transform: [fn: Transform]
  toggleFind: []
  print: []
  exportPdf: []
  preview: []
}>()

/** Leeres Dokument -> "Text loeschen" deaktivieren. */
const isEmpty = computed(() => store.activePlain.trim() === '')

/** Umschalten: alles markieren bzw. Markierung aufheben. */
function toggleSelectAll(): void {
  if (props.selection.allSelected) props.editor?.deselect()
  else props.editor?.selectAll()
}

const fileInput = ref<HTMLInputElement | null>(null)
const downloadOpen = ref(false)
const downloadRoot = ref<HTMLElement | null>(null)

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
  }
  reader.readAsText(file)
  input.value = ''
}

/* ---------- Export ---------- */
function download(ext: 'txt' | 'md'): void {
  const doc = store.activeDoc
  if (!doc) return
  // Reiner Text -- Inline-Formatierung (Fett/Kursiv/Farbe) gibt es nur in PDF/Druck.
  const blob = new Blob([store.activePlain], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.activeTitle || t.value.doc.untitled}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
  downloadOpen.value = false
}

function exportPdf(): void {
  downloadOpen.value = false
  emit('exportPdf')
}

async function copyAll(): Promise<void> {
  try {
    await navigator.clipboard.writeText(store.activePlain)
  } catch {
    /* Clipboard evtl. blockiert */
  }
}

/* ---------- Outside-Click ---------- */
function onDocClick(e: MouseEvent): void {
  const t = e.target as Node
  if (downloadRoot.value && !downloadRoot.value.contains(t)) downloadOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

defineExpose({ download, copyAll, triggerImport })
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-1 border-b border-zinc-200 bg-white px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900"
  >
    <button type="button" class="tb-btn" :title="t.toolbar.newTitle" @click="store.newDocument()">
      {{ t.toolbar.new }}
    </button>
    <button type="button" class="tb-btn" :title="t.toolbar.openTitle" @click="triggerImport">
      {{ t.toolbar.open }}
    </button>

    <div ref="downloadRoot" class="relative">
      <button
        type="button"
        class="tb-btn"
        :title="t.toolbar.saveTitle"
        @click="downloadOpen = !downloadOpen"
      >
        {{ t.toolbar.save }} ▾
      </button>
      <div
        v-if="downloadOpen"
        class="absolute left-0 z-20 mt-1 w-36 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      >
        <button type="button" class="menu-item" @click="download('txt')">
          {{ t.toolbar.asTxt }}
        </button>
        <button type="button" class="menu-item" @click="download('md')">
          {{ t.toolbar.asMd }}
        </button>
        <button type="button" class="menu-item leading-tight" @click="exportPdf">
          {{ t.toolbar.asPdf }}
          <span class="block text-xs text-zinc-400">{{ pageFormatLabel }}</span>
        </button>
      </div>
    </div>

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
      @click="store.clearActiveDocument()"
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
      :class="store.settings.focusMode ? 'text-accent' : ''"
      :title="t.toolbar.focusTitle"
      @click="store.updateSettings({ focusMode: !store.settings.focusMode })"
    >
      {{ t.toolbar.focus }}
    </button>

    <input
      ref="fileInput"
      type="file"
      accept=".txt,.md,.markdown,text/*"
      class="hidden"
      @change="onFileChosen"
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
