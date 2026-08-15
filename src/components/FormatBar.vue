<script setup lang="ts">
import { computed } from 'vue'
import { LIMITS, useEditorStore, type TextAlign, type ThemeMode } from '@/stores/editor'
import { findFont, fontList, isKnownFont } from '@/config/fonts'
import NumberStepper from './NumberStepper.vue'

const store = useEditorStore()

/** Schnellzugriff-Farben; die volle Auswahl liegt im Farbwaehler daneben. */
const SWATCHES = [
  { value: '', label: 'Automatisch (Design)' },
  { value: '#111827', label: 'Schwarz' },
  { value: '#6b7280', label: 'Grau' },
  { value: '#b91c1c', label: 'Rot' },
  { value: '#c2410c', label: 'Orange' },
  { value: '#15803d', label: 'Gruen' },
  { value: '#1d4ed8', label: 'Blau' },
  { value: '#7e22ce', label: 'Violett' },
] as const

/**
 * Ausrichtungs-Icons als Linienpaare [x, breite] in einem 16x16-Raster.
 * Selbst gezeichnet, damit kein Icon-Paket noetig ist und die Linien die
 * jeweilige Ausrichtung wirklich zeigen.
 */
const ALIGNMENTS: { value: TextAlign; label: string; lines: [number, number][] }[] = [
  {
    value: 'left',
    label: 'Linksbuendig',
    lines: [
      [1, 14],
      [1, 9],
      [1, 14],
      [1, 7],
    ],
  },
  {
    value: 'center',
    label: 'Zentriert',
    lines: [
      [1, 14],
      [4, 8],
      [1, 14],
      [5, 6],
    ],
  },
  {
    value: 'right',
    label: 'Rechtsbuendig',
    lines: [
      [1, 14],
      [6, 9],
      [1, 14],
      [8, 7],
    ],
  },
  {
    value: 'justify',
    label: 'Blocksatz',
    lines: [
      [1, 14],
      [1, 14],
      [1, 14],
      [1, 14],
    ],
  },
]

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'Auto' },
]

/** Farbe fuer <input type="color">, das keinen leeren Wert kennt. */
const colorInputValue = computed(() => store.settings.textColor || '#111827')

const activeFontStack = computed(() => findFont(store.settings.fontFamily).stack)

// Eine noch nicht geladene Schrift-ID wuerde das Auswahlfeld leer zeigen.
const selectedFontId = computed(() =>
  isKnownFont(store.settings.fontFamily) ? store.settings.fontFamily : 'sans',
)

function setColor(value: string): void {
  store.updateSettings({ textColor: value })
}
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60"
  >
    <!-- Schriftart -->
    <label class="fb-group">
      <span class="fb-label">Schrift</span>
      <select
        class="fb-select min-w-[8rem]"
        :value="selectedFontId"
        :style="{ fontFamily: activeFontStack }"
        title="Schriftart"
        @change="store.updateSettings({ fontFamily: ($event.target as HTMLSelectElement).value })"
      >
        <option v-for="f in fontList" :key="f.id" :value="f.id" :style="{ fontFamily: f.stack }">
          {{ f.label }}
        </option>
      </select>
    </label>

    <!-- Schriftgroesse -->
    <div class="fb-group">
      <span class="fb-label">Groesse</span>
      <NumberStepper
        :model-value="store.settings.fontSize"
        :min="LIMITS.fontSize.min"
        :max="LIMITS.fontSize.max"
        :step="LIMITS.fontSize.step"
        unit="px"
        label="Schriftgroesse"
        @update:model-value="store.updateSettings({ fontSize: $event })"
      />
    </div>

    <!-- Zeilenabstand -->
    <div class="fb-group">
      <span class="fb-label">Zeilen</span>
      <NumberStepper
        :model-value="store.settings.lineHeight"
        :min="LIMITS.lineHeight.min"
        :max="LIMITS.lineHeight.max"
        :step="LIMITS.lineHeight.step"
        :decimals="1"
        label="Zeilenabstand"
        @update:model-value="store.updateSettings({ lineHeight: $event })"
      />
    </div>

    <!-- Laufweite -->
    <div class="fb-group">
      <span class="fb-label">Laufweite</span>
      <NumberStepper
        :model-value="store.settings.letterSpacing"
        :min="LIMITS.letterSpacing.min"
        :max="LIMITS.letterSpacing.max"
        :step="LIMITS.letterSpacing.step"
        :decimals="1"
        unit="px"
        width="3.75rem"
        label="Laufweite"
        @update:model-value="store.updateSettings({ letterSpacing: $event })"
      />
    </div>

    <span class="fb-divider" />

    <!-- Textfarbe -->
    <div class="fb-group">
      <span class="fb-label">Farbe</span>
      <div class="flex items-center gap-1">
        <button
          v-for="s in SWATCHES"
          :key="s.value || 'auto'"
          type="button"
          class="h-5 w-5 rounded border transition-transform hover:scale-110"
          :class="
            store.settings.textColor === s.value
              ? 'border-accent ring-2 ring-accent/40'
              : 'border-zinc-300 dark:border-zinc-600'
          "
          :style="s.value ? { backgroundColor: s.value } : undefined"
          :title="s.label"
          :aria-label="s.label"
          :aria-pressed="store.settings.textColor === s.value"
          @click="setColor(s.value)"
        >
          <!-- Der Auto-Knopf zeigt statt einer Farbe ein A -->
          <span v-if="!s.value" class="text-[10px] font-semibold text-zinc-500">A</span>
        </button>
        <input
          type="color"
          class="h-6 w-7 cursor-pointer rounded border border-zinc-300 bg-transparent p-0.5 dark:border-zinc-600"
          :value="colorInputValue"
          title="Eigene Textfarbe waehlen"
          aria-label="Eigene Textfarbe waehlen"
          @input="setColor(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <span class="fb-divider" />

    <!-- Ausrichtung -->
    <div class="fb-group">
      <span class="fb-label">Ausrichtung</span>
      <div class="flex gap-1">
        <button
          v-for="a in ALIGNMENTS"
          :key="a.value"
          type="button"
          class="seg-btn flex h-[26px] w-7 items-center justify-center"
          :class="store.settings.textAlign === a.value ? 'seg-active' : ''"
          :title="a.label"
          :aria-label="a.label"
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

    <!-- Design -->
    <div class="fb-group">
      <span class="fb-label">Design</span>
      <div class="flex gap-1">
        <button
          v-for="t in THEMES"
          :key="t.value"
          type="button"
          class="seg-btn"
          :class="store.settings.theme === t.value ? 'seg-active' : ''"
          :aria-pressed="store.settings.theme === t.value"
          @click="store.updateSettings({ theme: t.value })"
        >
          {{ t.label }}
        </button>
      </div>
    </div>

    <!-- Zeilenumbruch -->
    <label class="flex cursor-pointer items-center gap-1.5" title="Lange Zeilen umbrechen">
      <input
        type="checkbox"
        class="accent-[rgb(var(--accent))]"
        :checked="store.settings.wordWrap"
        @change="store.updateSettings({ wordWrap: ($event.target as HTMLInputElement).checked })"
      />
      <span class="fb-label">Umbruch</span>
    </label>

    <button
      type="button"
      class="seg-btn ml-auto"
      title="Schrift, Groesse, Abstaende und Farbe zuruecksetzen"
      @click="store.resetFormatting()"
    >
      Zuruecksetzen
    </button>
  </div>
</template>

<style scoped>
.fb-group {
  @apply flex items-center gap-1.5;
}
.fb-label {
  @apply text-xs font-semibold text-zinc-500 dark:text-zinc-400;
}
.fb-select {
  @apply rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-accent dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200;
}
.fb-divider {
  @apply hidden h-5 w-px bg-zinc-200 sm:block dark:bg-zinc-700;
}
.seg-btn {
  @apply rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700;
}
.seg-active {
  @apply border-accent bg-accent-soft text-accent dark:bg-zinc-700;
}
</style>
