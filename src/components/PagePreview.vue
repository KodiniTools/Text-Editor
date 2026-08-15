<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { buildPages } from '@/utils/renderPages'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { findFont, fontList, loadFont } from '@/config/fonts'

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
// Neuere Rebuild-Anfragen gewinnen: nach dem await darf ein alter Lauf nicht
// mehr in den DOM schreiben.
let rebuildToken = 0

async function rebuild(): Promise<void> {
  const stageEl = stage.value
  const viewportEl = viewport.value
  if (!stageEl || !viewportEl) return

  const token = ++rebuildToken

  // Die gewaehlte Schrift VOR dem Messen laden -- sonst misst buildPages mit der
  // Ersatzschrift (falsche Zeilenhoehe/Umbruch) und die Vorschau zeigt die
  // falsche Schrift. In einem frisch geoeffneten Vorschau-Tab ist die eigene
  // Schrift beim ersten Rebuild evtl. noch nicht registriert; dann greift der
  // watch(fontList) unten und baut neu, sobald sie da ist.
  await loadFont(findFont(store.settings.fontFamily))
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      /* egal -- notfalls mit Fallback rendern */
    }
  }
  if (token !== rebuildToken || !stage.value || !viewport.value) return

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
// Eigene Schriften werden erst nach dem Start entdeckt (discoverFonts). Sobald
// die Liste waechst, neu aufbauen -- damit greift die gewaehlte Schrift auch,
// wenn sie beim ersten Rebuild noch nicht registriert war.
watch(fontList, rebuild)
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
