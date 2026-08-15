<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { buildPages } from '@/utils/renderPages'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { findFont, loadFont } from '@/config/fonts'

/**
 * Zeigt das Dokument exakt so, wie es als PDF exportiert wird: als Seiten im
 * gewaehlten Format mit der gewaehlten Schrift. Dieselbe buildPages-Funktion
 * erzeugt spaeter die Export-Seiten -- Vorschau und Datei sind damit identisch.
 * Die Seiten werden in voller Groesse gebaut und nur per CSS-Transform
 * herunterskaliert, damit der Zeilenumbruch dem Export entspricht.
 */
const store = useEditorStore()

const viewport = ref<HTMLElement | null>(null)
const stage = ref<HTMLElement | null>(null)
const scaledHeight = ref(0)

let currentRoot: HTMLElement | null = null
let rebuildTimer: ReturnType<typeof setTimeout> | null = null

function rebuild(): void {
  const stageEl = stage.value
  const viewportEl = viewport.value
  if (!stageEl || !viewportEl) return

  // Sicherstellen, dass die gewaehlte Schrift geladen ist, bevor gemessen wird.
  void loadFont(findFont(store.settings.fontFamily))

  const opts = pageRenderOptions(store.settings, store.activeContent)
  const { root, widthPx } = buildPages(opts)

  if (currentRoot) currentRoot.remove()
  currentRoot = root
  stageEl.appendChild(root)

  // Auf die Breite des Vorschaubereichs herunterskalieren (nie hochskalieren).
  const avail = viewportEl.clientWidth - 24
  const scale = Math.min(1, avail / widthPx)
  root.style.transform = `scale(${scale})`
  root.style.transformOrigin = 'top center'
  scaledHeight.value = root.scrollHeight * scale
}

function scheduleRebuild(): void {
  if (rebuildTimer) clearTimeout(rebuildTimer)
  rebuildTimer = setTimeout(rebuild, 250)
}

let resizeObserver: ResizeObserver | null = null
onMounted(() => {
  rebuild()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(rebuild)
    if (viewport.value) resizeObserver.observe(viewport.value)
  }
})
onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (rebuildTimer) clearTimeout(rebuildTimer)
  currentRoot?.remove()
})

// Inhalt tippen: sanft verzoegert neu aufbauen. Format/Schrift: sofort.
watch(() => store.activeContent, scheduleRebuild)
watch(
  () => [
    store.settings.pageFormat,
    store.settings.pageOrientation,
    store.settings.fontFamily,
    store.settings.fontSize,
    store.settings.lineHeight,
    store.settings.letterSpacing,
    store.settings.textAlign,
    store.settings.textColor,
    store.settings.wordWrap,
  ],
  rebuild,
)
</script>

<template>
  <div
    ref="viewport"
    class="h-full overflow-y-auto border-l border-zinc-200 bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-950"
  >
    <!-- Buehne: nimmt die skalierte Hoehe der Seiten ein, damit korrekt gescrollt wird. -->
    <div
      ref="stage"
      class="flex justify-center py-4"
      :style="{ height: `${scaledHeight + 32}px` }"
    />
  </div>
</template>
