<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useTextStats } from '@/composables/useTextStats'

const props = defineProps<{ cursorLine: number; cursorCol: number }>()
const store = useEditorStore()
const { stats } = useTextStats(toRef(store, 'activeContent'))

const readTime = computed(() =>
  stats.value.words === 0 ? '0 Min' : `${stats.value.readingMinutes} Min Lesezeit`,
)
</script>

<template>
  <div
    class="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-200 bg-zinc-50 px-4 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
  >
    <span>{{ stats.words }} Woerter</span>
    <span>{{ stats.characters }} Zeichen</span>
    <span>{{ stats.charactersNoSpaces }} ohne Leerz.</span>
    <span>{{ stats.lines }} Zeilen</span>
    <span>{{ stats.sentences }} Saetze</span>
    <span>{{ stats.paragraphs }} Absaetze</span>
    <span>{{ readTime }}</span>
    <span class="ml-auto">Z {{ props.cursorLine }}, Sp {{ props.cursorCol }}</span>
  </div>
</template>
