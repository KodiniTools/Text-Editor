<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { EditorApi } from '@/types'
import type { FindOptions } from '@/utils/find'
import { useI18n } from '@/i18n'
import { useToast } from '@/composables/useToast'
import { UiButton, UiIconButton } from '@/components/ui'

const props = defineProps<{ editor: EditorApi | null }>()
const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { showToast } = useToast()

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
  const n = props.editor?.replaceAll(query.value, replacement.value, opts.value) ?? 0
  if (n > 0) showToast(t.value.toast.replaced(n), { key: 'replace' })
  refreshCount()
}

function focus(): void {
  queryInput.value?.focus()
  queryInput.value?.select()
  refreshCount()
}

defineExpose({ focus, next, prev })
</script>

<template>
  <div class="flex flex-col gap-2 border-b border-line bg-surface-2 px-4 py-3">
    <div class="flex flex-wrap items-center gap-2">
      <input
        ref="queryInput"
        v-model="query"
        type="text"
        :placeholder="t.find.searchPlaceholder"
        class="fr-input min-w-40 flex-1"
        @keydown.enter.exact.prevent="next"
        @keydown.shift.enter.prevent="prev"
        @keydown.esc.prevent="emit('close')"
      />
      <UiButton size="sm" variant="secondary" :title="t.find.prevTitle" @click="prev">‹</UiButton>
      <UiButton size="sm" variant="secondary" :title="t.find.nextTitle" @click="next">›</UiButton>
      <span class="min-w-24 text-xs text-ink-3">{{ status }}</span>
      <UiIconButton size="sm" :label="t.find.closeTitle" @click="emit('close')">
        <svg viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </UiIconButton>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <input
        v-model="replacement"
        type="text"
        :placeholder="t.find.replacePlaceholder"
        class="fr-input min-w-40 flex-1"
      />
      <UiButton size="sm" variant="secondary" @click="replaceOne">{{ t.find.replace }}</UiButton>
      <UiButton size="sm" variant="secondary" @click="replaceAll">{{ t.find.replaceAll }}</UiButton>
    </div>

    <div class="flex flex-wrap gap-3 text-xs text-ink-2">
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.caseSensitive" type="checkbox" class="accent-accent" />
        {{ t.find.caseSensitive }}
      </label>
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.wholeWord" type="checkbox" class="accent-accent" />
        {{ t.find.wholeWord }}
      </label>
      <label class="flex cursor-pointer items-center gap-1">
        <input v-model="opts.regex" type="checkbox" class="accent-accent" />
        {{ t.find.regex }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.fr-input {
  @apply h-7 rounded-sm border border-line-strong bg-surface-1 px-2 text-sm text-ink outline-none focus:border-accent focus-visible:shadow-focus;
}
</style>
