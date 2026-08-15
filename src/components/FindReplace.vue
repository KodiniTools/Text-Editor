<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EditorApi } from '@/types'
import type { FindOptions } from '@/utils/find'

const props = defineProps<{ editor: EditorApi | null }>()
const emit = defineEmits<{ close: [] }>()

const query = ref('')
const replacement = ref('')
const opts = ref<FindOptions>({ caseSensitive: false, wholeWord: false, regex: false })
const matchCount = ref(0)
const queryInput = ref<HTMLInputElement | null>(null)

function refreshCount(): void {
  matchCount.value = props.editor ? props.editor.countMatches(query.value, opts.value) : 0
}

watch([query, opts], refreshCount, { deep: true })

const status = computed(() =>
  query.value === '' ? '' : matchCount.value === 0 ? 'Keine Treffer' : `${matchCount.value} Treffer`,
)

function next(): void {
  props.editor?.findNext(query.value, opts.value)
}
function prev(): void {
  props.editor?.findPrev(query.value, opts.value)
}
function replaceOne(): void {
  props.editor?.replaceCurrent(query.value, replacement.value, opts.value)
  refreshCount()
}
function replaceAll(): void {
  props.editor?.replaceAll(query.value, replacement.value, opts.value)
  refreshCount()
}

function focus(): void {
  queryInput.value?.focus()
  queryInput.value?.select()
  refreshCount()
}

defineExpose({ focus })
</script>

<template>
  <div
    class="flex flex-col gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
  >
    <div class="flex flex-wrap items-center gap-2">
      <input
        ref="queryInput"
        v-model="query"
        type="text"
        placeholder="Suchen"
        class="min-w-40 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        @keydown.enter.exact.prevent="next"
        @keydown.shift.enter.prevent="prev"
        @keydown.esc.prevent="emit('close')"
      />
      <button type="button" class="fr-btn" title="Vorheriger (Shift+Enter)" @click="prev">‹</button>
      <button type="button" class="fr-btn" title="Naechster (Enter)" @click="next">›</button>
      <span class="min-w-24 text-xs text-zinc-500 dark:text-zinc-400">{{ status }}</span>
      <button type="button" class="fr-btn" title="Schliessen (Esc)" @click="emit('close')">✕</button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="replacement"
        type="text"
        placeholder="Ersetzen durch"
        class="min-w-40 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      <button type="button" class="fr-btn px-3" @click="replaceOne">Ersetzen</button>
      <button type="button" class="fr-btn px-3" @click="replaceAll">Alle</button>
    </div>

    <div class="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-300">
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.caseSensitive" type="checkbox" /> Gross/Klein
      </label>
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.wholeWord" type="checkbox" /> Ganzes Wort
      </label>
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.regex" type="checkbox" /> Regex
      </label>
    </div>
  </div>
</template>

<style scoped>
.fr-btn {
  @apply rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700;
}
</style>
