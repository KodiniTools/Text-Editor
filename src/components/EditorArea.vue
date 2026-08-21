<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { SelectionFormat } from '@/types'
import { usePageView } from '@/composables/usePageView'
import { useRichText } from '@/composables/useRichText'
import { useEditorImages } from '@/composables/useEditorImages'
import { useEditorFind } from '@/composables/useEditorFind'
import { useI18n } from '@/i18n'

// Der Editor bündelt vier klar getrennte Belange in eigenen Composables:
//   usePageView     -- Seiten-Ansicht (A4/A3), Kennzahlen, Seitenumbruch
//   useRichText     -- contenteditable-Engine: Inhalt<->Store, Auswahl, Format
//   useEditorImages -- frei platzierte Bilder (einfügen/ziehen/skalieren/Link)
//   useEditorFind   -- Suchen & Ersetzen über die Textknoten
// Diese Komponente verdrahtet die Teile und stellt die öffentliche API bereit.
const store = useEditorStore()
const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    /** Zoomfaktor fuer den Fließtext (nur im Modus ohne Seitenformat, z. B. im
     *  Fokus). CSS `zoom` vergroessert die Darstellung, ohne das Feld aus dem
     *  Bearbeitungsfluss zu nehmen -- der Text bleibt also editierbar (anders als
     *  bei transform: scale). Standard 1 = keine Vergroesserung. */
    contentZoom?: number
  }>(),
  { contentZoom: 1 },
)

const emit = defineEmits<{
  cursor: [line: number, col: number]
  selchange: [state: SelectionFormat]
}>()

// contenteditable-Feld: nur so kann ein einzelnes Wort eine eigene Auszeichnung
// (Fett/Kursiv/Farbe ...) tragen. Der Inhalt wird als HTML im Store gehalten.
const editable = ref<HTMLElement | null>(null)

const page = usePageView(editable)
const rich = useRichText({
  editable,
  measure: page.measure,
  onCursor: (line, col) => emit('cursor', line, col),
  onSelection: (state) => emit('selchange', state),
})
const images = useEditorImages({
  editable,
  host: page.host,
  metrics: page.metrics,
  zoom: page.zoom,
  pageActive: page.pageActive,
  measure: page.measure,
})
const find = useEditorFind({
  editable,
  syncFromDom: rich.syncFromDom,
  reportCursor: rich.reportCursor,
})

// Für die Vorlage benötigte Bindungen (Refs/Computed behalten ihre Reaktivität).
const { host, pageActive, canvasStyle, sheetStyle, textStyle, pageBreaks } = page
const { editorStyle, onInput, onTab, onPaste, reportCursor, reportSelection } = rich

// Zoom nur ohne Seitenformat -- im Seiten-Modus uebernimmt das Blatt (page-sheet)
// die Skalierung ueber store.pageZoom. CSS `zoom` vergroessert die Darstellung,
// ohne das contenteditable aus dem Bearbeitungsfluss zu nehmen (Text editierbar).
const zoomStyle = computed(() =>
  !pageActive.value && props.contentZoom !== 1 ? { zoom: props.contentZoom } : undefined,
)
const {
  selectedImageId,
  imageStyle,
  startDrag,
  startResize,
  deleteImage,
  openImageLink,
  imageLinkOpen,
  imageLinkId,
  imageLinkMenu,
  imageLinkStyle,
  imageLinkInput,
  imageLinkUrl,
  applyImageLink,
  closeImageLink,
  removeImageLink,
} = images

// Öffentliche API der Komponente (für Werkzeug-/Format-Leiste, Suche, Kürzel).
defineExpose({
  focusEditor: rich.focusEditor,
  applyTransform: rich.applyTransform,
  insertText: rich.insertText,
  findNext: find.findNext,
  findPrev: find.findPrev,
  replaceCurrent: find.replaceCurrent,
  replaceAll: find.replaceAll,
  countMatches: find.countMatches,
  toggleBold: rich.toggleBold,
  toggleItalic: rich.toggleItalic,
  applyColor: rich.applyColor,
  toggleUnderline: rich.toggleUnderline,
  toggleStrikethrough: rich.toggleStrikethrough,
  toggleHighlight: rich.toggleHighlight,
  createLink: rich.createLink,
  removeLink: rich.removeLink,
  toggleQuote: rich.toggleQuote,
  clearFormatting: rich.clearFormatting,
  setBlock: rich.setBlock,
  toggleBulletList: rich.toggleBulletList,
  toggleNumberedList: rich.toggleNumberedList,
  selectAll: rich.selectAll,
  deselect: rich.deselect,
  insertImageFile: images.insertImageFile,
})
</script>

<template>
  <div
    ref="host"
    :class="pageActive ? 'page-backdrop h-full min-h-0' : 'plain-scroll flex h-full min-h-0 w-full'"
  >
    <div :class="pageActive ? 'page-canvas' : 'flex h-full min-h-0 w-full'" :style="canvasStyle">
      <div :class="pageActive ? 'page-sheet' : 'flex h-full min-h-0 w-full'" :style="sheetStyle">
        <div
          v-for="(y, i) in pageBreaks"
          :key="i"
          class="page-break-guide"
          :style="{ top: `${y}px` }"
          aria-hidden="true"
        />
        <div
          ref="editable"
          class="editor-text editor-rich outline-none"
          :class="
            pageActive ? 'relative block w-full' : 'plain-pad min-h-0 w-full flex-1 overflow-auto'
          "
          :style="[editorStyle, textStyle, zoomStyle]"
          contenteditable="true"
          role="textbox"
          aria-multiline="true"
          spellcheck="true"
          :data-placeholder="t.editor.placeholder"
          @input="onInput"
          @keydown.tab="onTab"
          @keyup="reportCursor"
          @mouseup="reportSelection"
          @pointerdown="selectedImageId = null"
          @paste="onPaste"
        />

        <!-- Frei platzierte Bilder (nur im Seiten-Modus). Position/Groesse
             content-relativ -> deckungsgleich mit Vorschau/PDF. -->
        <template v-if="pageActive">
          <div
            v-for="img in store.activeImages"
            :key="img.id"
            class="img-frame"
            :class="{ 'img-selected': img.id === selectedImageId }"
            :style="imageStyle(img)"
            @pointerdown.stop="startDrag(img, $event)"
          >
            <img :src="img.src" class="img-el" draggable="false" alt="" />
            <!-- Kennzeichnet ein verlinktes Bild; bei Auswahl zeigt stattdessen
                 der Link-Knopf den aktiven Zustand (kein Ueberlappen der Griffe). -->
            <span
              v-if="img.href && img.id !== selectedImageId"
              class="img-linkbadge"
              :title="t.editor.imageLinked(img.href)"
              aria-hidden="true"
            >
              <svg viewBox="0 0 16 16" class="h-3 w-3" aria-hidden="true">
                <path
                  d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
            <template v-if="img.id === selectedImageId">
              <span class="img-handle" @pointerdown.stop="startResize(img, $event)" />
              <button
                type="button"
                class="img-link-btn"
                :class="{ 'img-link-active': img.href }"
                :title="t.editor.imageLink"
                :aria-label="t.editor.imageLink"
                :aria-expanded="imageLinkOpen && imageLinkId === img.id"
                @pointerdown.stop
                @click.stop="openImageLink(img, $event)"
              >
                <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
                  <path
                    d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                class="img-del"
                :title="t.editor.imageDelete"
                :aria-label="t.editor.imageDelete"
                @pointerdown.stop
                @click.stop="deleteImage(img.id)"
              >
                ×
              </button>
            </template>
          </div>
        </template>
      </div>
    </div>

    <!-- Bild verlinken: kompaktes Popover am Link-Knopf (Teleport im <body>).
         Als Kind des Wurzel-<div> gehalten, damit EditorArea EINEN Wurzelknoten
         hat und das von aussen gesetzte class="h-full" (Hoehenbegrenzung der
         Seiten-Ansicht) zuverlaessig geerbt wird. Bewusst KEIN Vollbild-Overlay
         -> Footer bleibt sichtbar, Seite scrollbar. -->
    <Teleport to="body">
      <div
        v-if="imageLinkOpen"
        ref="imageLinkMenu"
        class="fixed z-50 w-64 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
        :style="imageLinkStyle"
        role="dialog"
        :aria-label="t.editor.imageLink"
      >
        <label
          class="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400"
          for="img-link-input"
        >
          {{ t.editor.imageLink }}
        </label>
        <input
          id="img-link-input"
          ref="imageLinkInput"
          v-model="imageLinkUrl"
          type="url"
          inputmode="url"
          class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-accent dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          :placeholder="t.editor.imageLinkPlaceholder"
          @keydown.enter.prevent="applyImageLink"
          @keydown.esc.prevent="closeImageLink"
        />
        <div class="mt-2 flex items-center justify-between gap-2">
          <button
            v-if="imageLinkUrl"
            type="button"
            class="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            @click="removeImageLink"
          >
            {{ t.editor.imageLinkRemove }}
          </button>
          <span v-else />
          <button
            type="button"
            class="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
            @click="applyImageLink"
          >
            {{ t.editor.imageLinkApply }}
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.editor-text {
  font-family: var(--editor-font);
  font-weight: var(--editor-weight, 400);
  font-style: var(--editor-style, normal);
  font-size: var(--editor-size);
  line-height: var(--editor-line-height);
  letter-spacing: var(--editor-letter-spacing);
  text-align: var(--editor-align);
  color: var(--editor-color, inherit);
  overflow-wrap: break-word;
  word-break: normal;
}

/* Absaetze/Zeilen des contenteditable ohne Aussenabstand -> gleiche Zeilenhoehe
   wie im Export (Bedingung fuer den zeilengenauen Seitenumbruch). */
.editor-rich :deep(div),
.editor-rich :deep(p) {
  margin: 0;
  padding: 0;
}

/* Frei platziertes Bild (Overlay im skalierten Blatt). */
.img-frame {
  position: absolute;
  z-index: 5;
  box-sizing: border-box;
  cursor: move;
  touch-action: none;
  user-select: none;
}
.img-el {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}
.img-selected {
  outline: 2px solid rgb(var(--accent));
  outline-offset: 1px;
}
/* Skalier-Griff unten rechts. */
.img-handle {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: rgb(var(--accent));
  border: 2px solid #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: nwse-resize;
  touch-action: none;
}
/* Loeschen oben rechts. */
.img-del {
  position: absolute;
  right: -10px;
  top: -10px;
  display: flex;
  height: 20px;
  width: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: rgb(220 38 38);
  color: #fff;
  font-size: 14px;
  line-height: 1;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}
/* Verlinken oben links. */
.img-link-btn {
  position: absolute;
  left: -10px;
  top: -10px;
  display: flex;
  height: 20px;
  width: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: #fff;
  color: rgb(63 63 70); /* zinc-700 */
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
  cursor: pointer;
}
.img-link-btn.img-link-active {
  background: rgb(var(--accent));
  color: #fff;
}
/* Badge unten links: markiert ein verlinktes Bild auch ohne Auswahl. */
.img-linkbadge {
  position: absolute;
  left: 4px;
  bottom: 4px;
  display: flex;
  height: 18px;
  width: 18px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: rgb(var(--accent));
  color: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
  pointer-events: none;
}

/* Touch: Skalier-Griff und Knoepfe groesser antippbar machen. */
@media (pointer: coarse) {
  .img-handle {
    right: -11px;
    bottom: -11px;
    width: 24px;
    height: 24px;
    border-radius: 5px;
  }
  .img-del {
    right: -14px;
    top: -14px;
    height: 30px;
    width: 30px;
    font-size: 18px;
  }
  .img-link-btn {
    left: -14px;
    top: -14px;
    height: 30px;
    width: 30px;
  }
}

/*
 * Bildschirm-Modus: der Klick-/Scrollbereich bleibt volle Breite, aber der
 * Textblock wird auf eine angenehme Lesebreite (max. 48rem) zentriert. Dadurch
 * brechen die Zeilen um -- und der Blocksatz wird sichtbar (statt bei voller
 * Fensterbreite in einzeiligen Absaetzen "wirkungslos" zu erscheinen). Das
 * Padding ist der halbe Ueberschuss ueber 48rem, mindestens aber 1,5rem.
 */
.plain-pad {
  padding: 1.25rem max(1.5rem, calc((100% - 48rem) / 2));
}

/* Platzhalter, solange das Feld leer ist. */
.editor-rich:empty::before,
.editor-rich:has(> br:only-child)::before {
  content: attr(data-placeholder);
  color: rgb(161 161 170); /* zinc-400 */
  pointer-events: none;
}

.plain-scroll {
  overflow: auto;
}

.page-backdrop {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow: auto;
  padding: 1rem;
  background: rgb(228 228 231); /* zinc-200 */
}
:global(.dark) .page-backdrop {
  background: rgb(9 9 11); /* zinc-950 */
}

.page-canvas {
  position: relative;
  flex: 0 0 auto;
}

.page-sheet {
  position: relative;
  box-sizing: border-box;
  background: #ffffff;
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.18);
  border-radius: 2px;
}
:global(.dark) .page-sheet {
  background: rgb(24 24 27); /* zinc-900 */
}

.page-break-guide {
  position: absolute;
  left: 0;
  right: 0;
  height: 0;
  border-top: 1px dashed rgb(161 161 170); /* zinc-400 */
  pointer-events: none;
}
:global(.dark) .page-break-guide {
  border-top-color: rgb(82 82 91); /* zinc-600 */
}
</style>
