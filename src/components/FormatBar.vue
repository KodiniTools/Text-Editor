<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { LIMITS, useEditorStore, type TextAlign } from '@/stores/editor'
import { findFont, fontList, isKnownFont, loadAllFonts, type EditorFont } from '@/config/fonts'
import { PAGE_FORMATS, type PageFormatId, type PageOrientation } from '@/utils/pageFormats'
import { useI18n } from '@/i18n'
import type { Messages } from '@/i18n/messages'
import type { BlockType, EditorApi, SelectionFormat } from '@/types'
import { useToast } from '@/composables/useToast'
import { useAnchoredMenu } from '@/composables/useAnchoredMenu'
import NumberStepper from './NumberStepper.vue'

// Design (Hell/Dunkel/Auto) und Sprache steuert die globale Navigation --
// deshalb liegen sie nicht mehr in der Format-Leiste.
const store = useEditorStore()
const { t } = useI18n()
const { showToast } = useToast()

// Editor-API + aktueller Auswahl-Zustand: fuer Inline-Fett/Kursiv/Farbe.
const props = defineProps<{ editor: EditorApi | null; selection: SelectionFormat }>()

type FormatKey = keyof Messages['format']

/** Schnellzugriff-Farben; die volle Auswahl liegt im Farbwaehler daneben. */
const SWATCHES: { value: string; labelKey: FormatKey }[] = [
  { value: '', labelKey: 'colorAuto' },
  { value: '#111827', labelKey: 'colorBlack' },
  { value: '#6b7280', labelKey: 'colorGray' },
  { value: '#b91c1c', labelKey: 'colorRed' },
  { value: '#c2410c', labelKey: 'colorOrange' },
  { value: '#15803d', labelKey: 'colorGreen' },
  { value: '#1d4ed8', labelKey: 'colorBlue' },
  { value: '#7e22ce', labelKey: 'colorViolet' },
]

/**
 * Ausrichtungs-Icons als Linienpaare [x, breite] in einem 16x16-Raster.
 * Selbst gezeichnet, damit kein Icon-Paket noetig ist und die Linien die
 * jeweilige Ausrichtung wirklich zeigen.
 */
const ALIGNMENTS: { value: TextAlign; labelKey: FormatKey; lines: [number, number][] }[] = [
  {
    value: 'left',
    labelKey: 'alignLeft',
    lines: [
      [1, 14],
      [1, 9],
      [1, 14],
      [1, 7],
    ],
  },
  {
    value: 'center',
    labelKey: 'alignCenter',
    lines: [
      [1, 14],
      [4, 8],
      [1, 14],
      [5, 6],
    ],
  },
  {
    value: 'right',
    labelKey: 'alignRight',
    lines: [
      [1, 14],
      [6, 9],
      [1, 14],
      [8, 7],
    ],
  },
  {
    value: 'justify',
    labelKey: 'alignJustify',
    lines: [
      [1, 14],
      [1, 14],
      [1, 14],
      [1, 14],
    ],
  },
]

/** Ausrichtung der Seite; deaktiviert, solange kein Papierformat gewaehlt ist. */
const ORIENTATIONS: { value: PageOrientation; labelKey: FormatKey }[] = [
  { value: 'portrait', labelKey: 'orientationPortrait' },
  { value: 'landscape', labelKey: 'orientationLandscape' },
]
const pageChosen = computed(() => store.settings.pageFormat !== 'none')

/** Farbe fuer <input type="color">, das keinen leeren Wert kennt. */
const colorInputValue = computed(() => store.settings.textColor || '#111827')

const activeFont = computed(() => findFont(store.settings.fontFamily))

// Eine noch nicht geladene Schrift-ID wuerde das Auswahlfeld leer zeigen.
const selectedFontId = computed(() =>
  isKnownFont(store.settings.fontFamily) ? store.settings.fontFamily : 'sans',
)

/** Systemschriften (ohne Familie) stehen vor den eigenen Schriften. */
const systemFonts = computed(() => fontList.value.filter((f) => !f.group))

/** Eigene Schriften nach Familie gruppiert -- eine <optgroup> je Familie. */
const fontGroups = computed(() => {
  const groups = new Map<string, EditorFont[]>()
  for (const f of fontList.value) {
    if (!f.group) continue
    const list = groups.get(f.group)
    if (list) list.push(f)
    else groups.set(f.group, [f])
  }
  return [...groups.entries()].map(([name, fonts]) => ({ name, fonts }))
})

// Damit jeder Eintrag im aufgeklappten Menue in seiner eigenen Schrift steht,
// muessen die Dateien geladen sein. Das native <select> zeichnet ein bereits
// offenes Menue nicht neu -- deshalb schon beim Hovern/Fokussieren laden, nicht
// erst beim Klick. Erst hier, nicht beim Seitenstart, damit die Startseite
// ohne Schrift-Downloads auskommt.
let previewsRequested = false
function loadFontPreviews(): void {
  if (previewsRequested) return
  previewsRequested = true
  loadAllFonts()
}

/**
 * Farbe: ist Text markiert, wird nur die Auswahl eingefaerbt (Inline). Ohne
 * Auswahl gilt die Farbe fuer das ganze Dokument (Standard-Textfarbe).
 */
function setColor(value: string): void {
  if (props.selection.hasSelection) props.editor?.applyColor(value)
  else store.updateSettings({ textColor: value })
}

/* ---------- Link-Editor (kleines Popover an der Link-Schaltflaeche) ---------- */
const {
  open: linkOpen,
  anchorEl: linkAnchor,
  menuEl: linkMenu,
  style: linkStyle,
  openMenu: openLinkMenu,
  close: closeLink,
} = useAnchoredMenu(280)
const linkUrl = ref('')
const linkInput = ref<HTMLInputElement | null>(null)

/** Ein Link laesst sich setzen, sobald Text markiert ist oder der Cursor bereits
 *  in einem Link steht. */
const canLink = computed(() => props.selection.hasSelection || props.selection.link)

/**
 * Oeffnet den Link-Editor. Ohne Auswahl (und nicht in einem Link) gibt es einen
 * kurzen Hinweis statt eines leeren Popovers. Die zuletzt gueltige Ziel-URL wird
 * vorbelegt, der Wert im Eingabefeld direkt markiert.
 */
function openLinkEditor(): void {
  if (!canLink.value) {
    showToast(t.value.toast.linkNeedsSelection, { type: 'info', key: 'linkNeedsSelection' })
    return
  }
  linkUrl.value = props.selection.linkHref
  openLinkMenu()
  nextTick(() => {
    linkInput.value?.focus()
    linkInput.value?.select()
  })
}

function applyLink(): void {
  props.editor?.createLink(linkUrl.value)
  closeLink()
}

function removeLinkAction(): void {
  props.editor?.removeLink()
  closeLink()
}

/**
 * Zuruecksetzen: entfernt Fett/Kursiv/Farbe aus dem Text. Ist Text markiert,
 * nur dort; sonst wird zusaetzlich die Dokument-Formatierung (Schrift, Groesse,
 * Abstaende, Farbe, Ausrichtung) auf den Standard gesetzt.
 */
function onReset(): void {
  props.editor?.clearFormatting()
  if (!props.selection.hasSelection) store.resetFormatting()
  showToast(t.value.toast.formatReset, { type: 'info', key: 'formatReset' })
}

// mod+K aus EditorView oeffnet denselben Link-Editor.
defineExpose({ openLinkEditor })
</script>

<template>
  <div
    class="hbar-scroll flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60"
  >
    <!-- Schriftart -->
    <label class="fb-group">
      <span class="fb-label">{{ t.format.font }}</span>
      <select
        class="fb-select min-w-[10rem]"
        :value="selectedFontId"
        :style="{
          fontFamily: activeFont.stack,
          fontWeight: activeFont.weight,
          fontStyle: activeFont.style,
        }"
        :title="t.format.fontTitle"
        @pointerenter="loadFontPreviews"
        @focus="loadFontPreviews"
        @change="store.updateSettings({ fontFamily: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="f in systemFonts" :key="f.id" :value="f.id" :style="{ fontFamily: f.stack }">
          {{ f.label }}
        </option>
        <optgroup v-for="g in fontGroups" :key="g.name" :label="g.name">
          <!-- Volle Beschriftung ('Switzer Bold'), damit das zugeklappte Feld
               die Schrift eindeutig zeigt; die Gruppe hilft nur beim Blaettern. -->
          <option
            v-for="f in g.fonts"
            :key="f.id"
            :value="f.id"
            :style="{ fontFamily: f.stack, fontWeight: f.weight, fontStyle: f.style }"
          >
            {{ f.label }}
          </option>
        </optgroup>
      </select>
    </label>

    <!-- Schriftgroesse -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.size }}</span>
      <NumberStepper
        :model-value="store.settings.fontSize"
        :min="LIMITS.fontSize.min"
        :max="LIMITS.fontSize.max"
        :step="LIMITS.fontSize.step"
        unit="px"
        :label="t.format.sizeLabel"
        @update:model-value="store.updateSettings({ fontSize: $event })"
      />
    </div>

    <!-- Zeilenabstand -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.lineHeight }}</span>
      <NumberStepper
        :model-value="store.settings.lineHeight"
        :min="LIMITS.lineHeight.min"
        :max="LIMITS.lineHeight.max"
        :step="LIMITS.lineHeight.step"
        :decimals="1"
        width="1.6rem"
        :label="t.format.lineHeightLabel"
        @update:model-value="store.updateSettings({ lineHeight: $event })"
      />
    </div>

    <!-- Laufweite -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.letterSpacing }}</span>
      <NumberStepper
        :model-value="store.settings.letterSpacing"
        :min="LIMITS.letterSpacing.min"
        :max="LIMITS.letterSpacing.max"
        :step="LIMITS.letterSpacing.step"
        :decimals="1"
        unit="px"
        width="2.9rem"
        :label="t.format.letterSpacingLabel"
        @update:model-value="store.updateSettings({ letterSpacing: $event })"
      />
    </div>

    <span class="fb-divider" />

    <!-- Inline-Stil: Fett/Kursiv/Unterstrichen/Durchgestrichen/Highlight/Link -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.style }}</span>
      <div class="flex gap-1">
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center font-bold"
          :class="selection.bold ? 'seg-active' : ''"
          :title="t.format.boldTitle"
          :aria-label="t.format.bold"
          :aria-pressed="selection.bold"
          @mousedown.prevent
          @click="editor?.toggleBold()"
        >
          F
        </button>
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center italic"
          :class="selection.italic ? 'seg-active' : ''"
          :title="t.format.italicTitle"
          :aria-label="t.format.italic"
          :aria-pressed="selection.italic"
          @mousedown.prevent
          @click="editor?.toggleItalic()"
        >
          K
        </button>
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center underline"
          :class="selection.underline ? 'seg-active' : ''"
          :title="t.format.underlineTitle"
          :aria-label="t.format.underline"
          :aria-pressed="selection.underline"
          @mousedown.prevent
          @click="editor?.toggleUnderline()"
        >
          U
        </button>
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center line-through"
          :class="selection.strikethrough ? 'seg-active' : ''"
          :title="t.format.strikethroughTitle"
          :aria-label="t.format.strikethrough"
          :aria-pressed="selection.strikethrough"
          @mousedown.prevent
          @click="editor?.toggleStrikethrough()"
        >
          S
        </button>
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center"
          :class="selection.highlight ? 'seg-active' : ''"
          :title="t.format.highlightTitle"
          :aria-label="t.format.highlight"
          :aria-pressed="selection.highlight"
          @mousedown.prevent
          @click="editor?.toggleHighlight()"
        >
          <!-- Textmarker: Stift mit Spitze -->
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M9.5 2.5l4 4-6 6H3.5v-4l6-6z"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linejoin="round"
            />
            <path
              d="M2.5 14.5h11"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          ref="linkAnchor"
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center"
          :class="selection.link ? 'seg-active' : ''"
          :title="t.format.linkTitle"
          :aria-label="t.format.link"
          :aria-pressed="selection.link"
          :aria-expanded="linkOpen"
          :disabled="!canLink"
          @mousedown.prevent
          @click="openLinkEditor()"
        >
          <!-- Kettenglied -->
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 0 1 4.5 9l1-1"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <span class="fb-divider" />

    <!-- Absatz / Ueberschrift -->
    <label class="fb-group">
      <span class="fb-label">{{ t.format.block }}</span>
      <select
        class="fb-select"
        :value="selection.block"
        :title="t.format.block"
        @change="editor?.setBlock(($event.target as HTMLSelectElement).value as BlockType)"
      >
        <option value="p">{{ t.format.blockNormal }}</option>
        <option value="h1">{{ t.format.heading1 }}</option>
        <option value="h2">{{ t.format.heading2 }}</option>
        <option value="h3">{{ t.format.heading3 }}</option>
      </select>
    </label>

    <!-- Zitat (blockquote) -->
    <div class="fb-group">
      <button
        type="button"
        class="seg-btn flex h-7 w-7 items-center justify-center"
        :class="selection.quote ? 'seg-active' : ''"
        :title="t.format.quoteTitle"
        :aria-label="t.format.quote"
        :aria-pressed="selection.quote"
        @mousedown.prevent
        @click="editor?.toggleQuote()"
      >
        <!-- Anfuehrungszeichen -->
        <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
          <path
            d="M6 4c-2 0-3.2 1.4-3.2 3.3 0 1.6 1.1 2.7 2.5 2.7 1 0 1.7-.6 1.7-1.5 0-.8-.6-1.4-1.4-1.4-.2 0-.4 0-.5.1.1-.9.9-1.5 1.9-1.6L6 4zm6 0c-2 0-3.2 1.4-3.2 3.3 0 1.6 1.1 2.7 2.5 2.7 1 0 1.7-.6 1.7-1.5 0-.8-.6-1.4-1.4-1.4-.2 0-.4 0-.5.1.1-.9.9-1.5 1.9-1.6L12 4z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>

    <!-- Listen -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.list }}</span>
      <div class="flex gap-1">
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center"
          :class="selection.bulletList ? 'seg-active' : ''"
          :title="t.format.bulletListTitle"
          :aria-label="t.format.bulletList"
          :aria-pressed="selection.bulletList"
          @mousedown.prevent
          @click="editor?.toggleBulletList()"
        >
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
            <circle cx="2.5" cy="4" r="1.2" fill="currentColor" />
            <circle cx="2.5" cy="8" r="1.2" fill="currentColor" />
            <circle cx="2.5" cy="12" r="1.2" fill="currentColor" />
            <path
              d="M6 4h8M6 8h8M6 12h8"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center"
          :class="selection.numberedList ? 'seg-active' : ''"
          :title="t.format.numberedListTitle"
          :aria-label="t.format.numberedList"
          :aria-pressed="selection.numberedList"
          @mousedown.prevent
          @click="editor?.toggleNumberedList()"
        >
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
            <text x="0.5" y="5.5" font-size="5" fill="currentColor">1</text>
            <text x="0.5" y="10" font-size="5" fill="currentColor">2</text>
            <text x="0.5" y="14.5" font-size="5" fill="currentColor">3</text>
            <path
              d="M6 4h8M6 8h8M6 12h8"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <span class="fb-divider" />

    <!-- Textfarbe -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.color }}</span>
      <div class="flex items-center gap-1">
        <button
          v-for="s in SWATCHES"
          :key="s.value || 'auto'"
          type="button"
          class="fb-swatch inline-flex h-5 w-5 items-center justify-center rounded border leading-none transition-transform hover:scale-110"
          :class="
            store.settings.textColor === s.value
              ? 'border-accent ring-2 ring-accent/40'
              : 'border-zinc-300 dark:border-zinc-600'
          "
          :style="s.value ? { backgroundColor: s.value } : undefined"
          :title="t.format[s.labelKey]"
          :aria-label="t.format[s.labelKey]"
          :aria-pressed="store.settings.textColor === s.value"
          @mousedown.prevent
          @click="setColor(s.value)"
        >
          <!-- Der Auto-Knopf zeigt statt einer Farbe ein A -->
          <span v-if="!s.value" class="text-[10px] font-semibold text-zinc-500">A</span>
        </button>
        <input
          type="color"
          class="fb-color h-7 w-8 cursor-pointer rounded-md border border-zinc-300 bg-transparent p-0.5 dark:border-zinc-600"
          :value="colorInputValue"
          :title="t.format.customColor"
          :aria-label="t.format.customColor"
          @input="setColor(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <span class="fb-divider" />

    <!-- Ausrichtung -->
    <div class="fb-group">
      <span class="fb-label">{{ t.format.align }}</span>
      <div class="flex gap-1">
        <button
          v-for="a in ALIGNMENTS"
          :key="a.value"
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center"
          :class="store.settings.textAlign === a.value ? 'seg-active' : ''"
          :title="t.format[a.labelKey]"
          :aria-label="t.format[a.labelKey]"
          :aria-pressed="store.settings.textAlign === a.value"
          @click="store.updateSettings({ textAlign: a.value })"
        >
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
            <line
              v-for="(l, i) in a.lines"
              :key="i"
              :x1="l[0]"
              :x2="l[0] + l[1]"
              :y1="2.5 + i * 3.7"
              :y2="2.5 + i * 3.7"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </div>

    <span class="fb-divider" />

    <!-- Seitenformat -->
    <label class="fb-group">
      <span class="fb-label">{{ t.format.page }}</span>
      <select
        class="fb-select"
        :value="store.settings.pageFormat"
        :title="t.format.page"
        @change="
          store.updateSettings({
            pageFormat: ($event.target as HTMLSelectElement).value as PageFormatId,
          })
        "
      >
        <option value="none">{{ t.format.pageScreen }}</option>
        <option v-for="f in PAGE_FORMATS" :key="f.id" :value="f.id">{{ f.label }}</option>
      </select>
    </label>

    <!-- Ausrichtung der Seite (nur bei gewaehltem Format) -->
    <div v-if="pageChosen" class="fb-group">
      <div class="flex gap-1">
        <button
          v-for="o in ORIENTATIONS"
          :key="o.value"
          type="button"
          class="seg-btn flex h-7 w-7 items-center justify-center"
          :class="store.settings.pageOrientation === o.value ? 'seg-active' : ''"
          :title="t.format[o.labelKey]"
          :aria-label="t.format[o.labelKey]"
          :aria-pressed="store.settings.pageOrientation === o.value"
          @click="store.updateSettings({ pageOrientation: o.value })"
        >
          <!-- Rechteck hoch bzw. quer -->
          <svg viewBox="0 0 16 16" class="h-3.5 w-3.5" aria-hidden="true">
            <rect
              v-if="o.value === 'portrait'"
              x="4.5"
              y="2"
              width="7"
              height="12"
              rx="1"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
            />
            <rect
              v-else
              x="2"
              y="4.5"
              width="12"
              height="7"
              rx="1"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
            />
          </svg>
        </button>
      </div>
    </div>

    <!-- Zoom der Seiten-Ansicht (nur bei gewaehltem Format) -->
    <div v-if="pageChosen" class="fb-group">
      <span class="fb-label">{{ t.format.zoom }}</span>
      <input
        type="range"
        class="zoom-range"
        :min="LIMITS.zoom.min"
        :max="LIMITS.zoom.max"
        :step="LIMITS.zoom.step"
        :value="store.settings.pageZoom"
        :title="t.format.zoomTitle"
        :aria-label="t.format.zoomTitle"
        @input="
          store.updateSettings({ pageZoom: Number(($event.target as HTMLInputElement).value) })
        "
      />
      <button
        type="button"
        class="fb-label tabular-nums hover:text-accent"
        :title="t.format.zoomReset"
        :aria-label="t.format.zoomReset"
        @click="store.updateSettings({ pageZoom: 1 })"
      >
        {{ Math.round(store.settings.pageZoom * 100) }}%
      </button>
    </div>

    <span class="fb-divider" />

    <!-- Zeilenumbruch -->
    <label class="flex cursor-pointer items-center gap-1.5" :title="t.format.wrapTitle">
      <input
        type="checkbox"
        class="accent-[rgb(var(--accent))]"
        :checked="store.settings.wordWrap"
        @change="store.updateSettings({ wordWrap: ($event.target as HTMLInputElement).checked })"
      />
      <span class="fb-label">{{ t.format.wrap }}</span>
    </label>

    <button
      type="button"
      class="seg-btn ml-auto"
      :title="t.format.resetTitle"
      @mousedown.prevent
      @click="onReset"
    >
      {{ t.format.reset }}
    </button>
  </div>

  <!-- Link-Editor: an der Link-Schaltflaeche verankert, per Teleport im <body>,
       damit es in der (auf Mobile horizontal scrollenden) Leiste nicht
       abgeschnitten wird. -->
  <Teleport to="body">
    <div
      v-if="linkOpen"
      ref="linkMenu"
      class="fixed z-50 w-72 rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      :style="linkStyle"
    >
      <label class="mb-1 block text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {{ t.format.link }}
      </label>
      <input
        ref="linkInput"
        v-model="linkUrl"
        type="url"
        inputmode="url"
        class="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-800 outline-none focus:border-accent dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        :placeholder="t.format.linkPlaceholder"
        @keydown.enter.prevent="applyLink"
        @keydown.esc.prevent="closeLink"
      />
      <div class="mt-2 flex items-center justify-between gap-2">
        <button
          v-if="selection.link"
          type="button"
          class="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          @click="removeLinkAction"
        >
          {{ t.format.linkRemove }}
        </button>
        <span v-else />
        <button
          type="button"
          class="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-white hover:opacity-90"
          @click="applyLink"
        >
          {{ t.format.linkApply }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.fb-group {
  @apply flex items-center gap-1.5;
}
.fb-label {
  @apply text-xs font-semibold text-zinc-500 dark:text-zinc-400;
}
.fb-select {
  @apply h-7 rounded-md border border-zinc-300 bg-white px-2 text-xs text-zinc-700 outline-none focus:border-accent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200;
}
.fb-divider {
  @apply mx-0.5 hidden h-6 w-px bg-zinc-200 sm:block dark:bg-zinc-700;
}
/* Einheitliche Knopfhoehe wie Auswahl-/Zahlenfelder (28px). */
.seg-btn {
  @apply inline-flex h-7 items-center justify-center rounded-md border border-zinc-300 px-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700;
}
.seg-active {
  @apply border-accent bg-accent-soft text-accent dark:bg-zinc-700;
}
.zoom-range {
  @apply h-1 w-24 cursor-pointer accent-[rgb(var(--accent))];
}
</style>
