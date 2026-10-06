<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useTextStats } from '@/composables/useTextStats'
import { useI18n } from '@/i18n'
import { usePageFormatLabel } from '@/composables/usePageFormatLabel'

const props = defineProps<{ cursorLine: number; cursorCol: number }>()
const store = useEditorStore()
const { t } = useI18n()
const { stats } = useTextStats(toRef(store, 'activePlain'))

const readTime = computed(() => t.value.status.readingTime(stats.value.readingMinutes))
// Immer sichtbar: in welchem Format Speichern/Drucken erfolgt.
const pageFormatLabel = usePageFormatLabel()
</script>

<template>
  <div
    class="hbar-scroll flex flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap border-t border-line bg-surface-2 px-4 py-1.5 text-xs text-ink-3"
  >
    <span>{{ stats.words }} {{ t.status.words }}</span>
    <span>{{ stats.characters }} {{ t.status.characters }}</span>
    <span>{{ stats.charactersNoSpaces }} {{ t.status.charactersNoSpaces }}</span>
    <span>{{ stats.lines }} {{ t.status.lines }}</span>
    <span>{{ stats.sentences }} {{ t.status.sentences }}</span>
    <span>{{ stats.paragraphs }} {{ t.status.paragraphs }}</span>
    <span>{{ readTime }}</span>
    <span
      class="ml-auto inline-flex items-center gap-1 rounded-sm bg-surface-3 px-2 py-0.5 font-medium text-ink-2"
      :title="t.format.page"
    >
      <svg viewBox="0 0 16 16" class="h-3 w-3" aria-hidden="true">
        <rect
          x="3"
          y="1.5"
          width="10"
          height="13"
          rx="1"
          fill="none"
          stroke="currentColor"
          stroke-width="1.3"
        />
      </svg>
      {{ pageFormatLabel }}
    </span>
    <span
      >{{ t.status.line }} {{ props.cursorLine }}, {{ t.status.col }} {{ props.cursorCol }}</span
    >
  </div>
</template>
