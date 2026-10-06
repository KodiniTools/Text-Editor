<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEditorStore } from '@/stores/editor'
import { useI18n } from '@/i18n'
import { pageSizeCss } from '@/utils/pageFormats'
import { usePageFormatLabel } from '@/composables/usePageFormatLabel'
import PagePreview from '@/components/PagePreview.vue'
import { UiButton } from '@/components/ui'

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
const router = useRouter()

/**
 * Zurueck zum Editor. Diese Ansicht hat der Editor per window.open geoeffnet --
 * deshalb den Vorschau-Tab schliessen, damit der Nutzer im urspruenglichen
 * Editor-Tab landet (dort ist die Undo/Redo-Historie erhalten). Wurde die
 * Vorschau direkt geoeffnet/gebookmarkt und laesst sich nicht per Skript
 * schliessen, im selben Tab zum Editor navigieren.
 */
function backToEditor(): void {
  // Nur wenn der Editor diesen Tab geoeffnet hat (Marker im Hash), schliessen --
  // dann landet der Nutzer im urspruenglichen Editor-Tab mit erhaltener
  // Historie. Sonst (direkt geoeffnet/gebookmarkt) im selben Tab zum Editor.
  if (window.location.hash.includes('from=editor')) {
    window.close()
    window.setTimeout(() => {
      if (!window.closed) router.push({ name: 'editor' })
    }, 150)
  } else {
    router.push({ name: 'editor' })
  }
}

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
  <div class="flex h-full min-h-0 flex-col bg-surface-2">
    <header
      class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-surface-1 px-4 py-2"
    >
      <div class="min-w-0">
        <h1 class="truncate text-sm font-semibold text-ink">
          {{ store.activeTitle || t.previewView.title }}
        </h1>
        <p class="truncate text-xs text-ink-3">
          {{ t.previewView.subtitle }} · {{ pageFormatLabel }}
        </p>
      </div>
      <div class="ml-auto flex items-center gap-2">
        <UiButton
          size="sm"
          variant="secondary"
          :title="t.previewView.backTitle"
          @click="backToEditor"
        >
          {{ t.previewView.back }}
        </UiButton>
        <UiButton size="sm" variant="primary" @click="printDocument">
          {{ t.previewView.print }}
        </UiButton>
      </div>
    </header>

    <div class="min-h-0 flex-1">
      <PagePreview />
    </div>
  </div>
</template>
