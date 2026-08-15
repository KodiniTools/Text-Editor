<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import TransformMenu from './TransformMenu.vue'
import type { Transform } from '@/utils/textTransforms'

const store = useEditorStore()

const emit = defineEmits<{
  transform: [fn: Transform]
  toggleFind: []
}>()

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
  const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${doc.name || 'dokument'}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
  downloadOpen.value = false
}

async function copyAll(): Promise<void> {
  try {
    await navigator.clipboard.writeText(store.activeContent)
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
    <button type="button" class="tb-btn" title="Neu (Strg+M)" @click="store.newDocument()">
      Neu
    </button>
    <button type="button" class="tb-btn" title="Datei oeffnen" @click="triggerImport">
      Oeffnen
    </button>

    <div ref="downloadRoot" class="relative">
      <button
        type="button"
        class="tb-btn"
        title="Herunterladen (Strg+S)"
        @click="downloadOpen = !downloadOpen"
      >
        Speichern ▾
      </button>
      <div
        v-if="downloadOpen"
        class="absolute left-0 z-20 mt-1 w-36 rounded-lg border border-zinc-200 bg-white p-1 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      >
        <button type="button" class="menu-item" @click="download('txt')">Als .txt</button>
        <button type="button" class="menu-item" @click="download('md')">Als .md</button>
      </div>
    </div>

    <button type="button" class="tb-btn" title="Alles kopieren" @click="copyAll">Kopieren</button>

    <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

    <button
      type="button"
      class="tb-btn"
      :disabled="!store.canUndo"
      title="Rueckgaengig (Strg+Z)"
      @click="store.undo()"
    >
      ↶
    </button>
    <button
      type="button"
      class="tb-btn"
      :disabled="!store.canRedo"
      title="Wiederholen (Strg+Y)"
      @click="store.redo()"
    >
      ↷
    </button>

    <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

    <TransformMenu @apply="(fn: Transform) => emit('transform', fn)" />
    <button
      type="button"
      class="tb-btn"
      title="Suchen & Ersetzen (Strg+F)"
      @click="emit('toggleFind')"
    >
      Suchen
    </button>

    <span class="mx-1 h-5 w-px bg-zinc-200 dark:bg-zinc-700" />

    <button
      type="button"
      class="tb-btn"
      :class="store.settings.showPreview ? 'text-accent' : ''"
      title="Markdown-Vorschau"
      @click="store.updateSettings({ showPreview: !store.settings.showPreview })"
    >
      Vorschau
    </button>
    <button
      type="button"
      class="tb-btn"
      :class="store.settings.focusMode ? 'text-accent' : ''"
      title="Fokus-Modus"
      @click="store.updateSettings({ focusMode: !store.settings.focusMode })"
    >
      Fokus
    </button>

    <button
      type="button"
      class="tb-btn ml-auto"
      :class="store.settings.showFormatBar ? 'text-accent' : ''"
      :aria-pressed="store.settings.showFormatBar"
      title="Format-Leiste ein-/ausblenden"
      @click="store.updateSettings({ showFormatBar: !store.settings.showFormatBar })"
    >
      Format {{ store.settings.showFormatBar ? '▴' : '▾' }}
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
