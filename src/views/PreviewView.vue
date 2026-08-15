<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useI18n } from '@/i18n'
import { pageSizeCss } from '@/utils/pageFormats'
import { usePageFormatLabel } from '@/composables/usePageFormatLabel'
import PagePreview from '@/components/PagePreview.vue'

/**
 * Vollbild-Vorschau in einem eigenen Tab. Zeigt das Dokument exakt so, wie es
 * gespeichert/gedruckt wird. Der Tab ist eine eigene App-Instanz und liest den
 * Stand beim Start aus dem localStorage -- der Editor-Tab schreibt vor dem
 * Oeffnen (store.persistNow). Aenderungen im Editor-Tab werden uebernommen,
 * sobald sie im localStorage landen (storage-Event).
 */
const store = useEditorStore()
const { t } = useI18n()
const pageFormatLabel = usePageFormatLabel()

// @page-Regel setzen, damit "Drucken" im gewaehlten Format ausgibt.
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

// Beim Tippen im Editor-Tab werden Dokumente/Settings im localStorage
// aktualisiert -- hier neu laden, damit die Vorschau mitzieht.
function onStorage(e: StorageEvent): void {
  if (e.key && e.key.startsWith('kodini-editor-')) location.reload()
}

onMounted(() => {
  syncPageStyle()
  window.addEventListener('storage', onStorage)
})
onBeforeUnmount(() => {
  pageStyleEl?.remove()
  window.removeEventListener('storage', onStorage)
})
watch(() => [store.settings.pageFormat, store.settings.pageOrientation], syncPageStyle)

function printDocument(): void {
  syncPageStyle()
  window.print()
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-zinc-200 dark:bg-zinc-950">
    <header
      class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-zinc-300 bg-white px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div class="min-w-0">
        <h1 class="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {{ store.activeDoc?.name || t.previewView.title }}
        </h1>
        <p class="truncate text-xs text-zinc-500 dark:text-zinc-400">
          {{ t.previewView.subtitle }} · {{ pageFormatLabel }}
        </p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <RouterLink to="/" class="pv-btn">{{ t.previewView.back }}</RouterLink>
        <button type="button" class="pv-btn pv-btn-primary" @click="printDocument">
          {{ t.previewView.print }}
        </button>
      </div>
    </header>

    <div class="min-h-0 flex-1">
      <PagePreview />
    </div>
  </div>
</template>

<style scoped>
.pv-btn {
  @apply rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800;
}
.pv-btn-primary {
  @apply border-accent bg-accent text-white hover:bg-accent/90 dark:text-white;
}
</style>
