<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EditorApi } from '@/types'
import type { FindOptions } from '@/utils/find'
import { useI18n } from '@/i18n'

const props = defineProps<{ editor: EditorApi | null }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()

const query = ref('')
const replacement = ref('')
const opts = ref<FindOptions>({ caseSensitive: false, wholeWord: false, regex: false })
const matchCount = ref(0)
const queryInput = ref<HTMLInputElement | null>(null)

function refreshCount(): void {
  matchCount.value = props.editor ? props.editor.countMatches(query.value, opts.value) : 0
}

watch([query, opts], refreshCount, { deep: true })

const status = computed(() => (query.value === '' ? '' : t.value.find.matches(matchCount.value)))

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
        :placeholder="t.find.searchPlaceholder"
        class="min-w-40 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
        @keydown.enter.exact.prevent="next"
        @keydown.shift.enter.prevent="prev"
        @keydown.esc.prevent="emit('close')"
      />
      <button type="button" class="fr-btn" :title="t.find.prevTitle" @click="prev">‹</button>
      <button type="button" class="fr-btn" :title="t.find.nextTitle" @click="next">›</button>
      <span class="min-w-24 text-xs text-zinc-500 dark:text-zinc-400">{{ status }}</span>
      <button type="button" class="fr-btn" :title="t.find.closeTitle" @click="emit('close')">
        ✕
      </button>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="replacement"
        type="text"
        :placeholder="t.find.replacePlaceholder"
        class="min-w-40 flex-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm outline-none focus:border-accent dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
      />
      <button type="button" class="fr-btn px-3" @click="replaceOne">{{ t.find.replace }}</button>
      <button type="button" class="fr-btn px-3" @click="replaceAll">{{ t.find.replaceAll }}</button>
    </div>

    <div class="flex flex-wrap gap-3 text-xs text-zinc-600 dark:text-zinc-300">
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.caseSensitive" type="checkbox" /> {{ t.find.caseSensitive }}
      </label>
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.wholeWord" type="checkbox" /> {{ t.find.wholeWord }}
      </label>
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.regex" type="checkbox" /> {{ t.find.regex }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.fr-btn {
  @apply rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700;
}
</style>
