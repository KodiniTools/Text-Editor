<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { renderMarkdown } from '@/utils/markdown'
import { useI18n } from '@/i18n'

/**
 * Live-Vorschau des Dokuments als Markdown. Gerendert wird der REINE TEXT des
 * Dokuments (store.activePlain) -- also die Markdown-Quelle, die man tippt
 * (`# Titel`, `- Punkt`, `**fett**`, `[Link](…)`), nicht die Rich-Text-Auszeichnung.
 * So dient der Editor zugleich als Markdown-Quelle; wer lieber die Werkzeugleiste
 * nutzt, laesst die Vorschau einfach zu.
 */
const store = useEditorStore()
const { t } = useI18n()

const emit = defineEmits<{ close: [] }>()

const source = computed(() => store.activePlain)
const html = computed(() => renderMarkdown(source.value))
const isEmpty = computed(() => source.value.trim() === '')
</script>

<template>
  <section
    class="flex min-h-0 flex-col bg-white dark:bg-zinc-900"
    :aria-label="t.markdownPreview.title"
  >
    <header
      class="flex items-center justify-between gap-2 border-b border-zinc-200 px-3 py-1.5 dark:border-zinc-800"
    >
      <span class="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {{ t.markdownPreview.title }}
      </span>
      <button
        type="button"
        class="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        :title="t.markdownPreview.close"
        :aria-label="t.markdownPreview.close"
        @click="emit('close')"
      >
        <svg viewBox="0 0 16 16" class="h-4 w-4" aria-hidden="true">
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <p v-if="isEmpty" class="px-6 py-5 text-sm text-zinc-400">
        {{ t.markdownPreview.empty }}
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -- renderMarkdown bereinigt via DOMPurify -->
      <article v-else class="md-preview px-6 py-5" v-html="html" />
    </div>
  </section>
</template>

<style scoped>
.md-preview :deep(h1) {
  @apply mb-3 mt-4 text-2xl font-bold text-zinc-900 first:mt-0 dark:text-zinc-50;
}
.md-preview :deep(h2) {
  @apply mb-2 mt-4 text-xl font-semibold text-zinc-900 first:mt-0 dark:text-zinc-50;
}
.md-preview :deep(h3) {
  @apply mb-2 mt-3 text-lg font-semibold text-zinc-800 first:mt-0 dark:text-zinc-100;
}
.md-preview :deep(p) {
  @apply mb-3 leading-relaxed text-zinc-700 dark:text-zinc-300;
}
.md-preview :deep(ul) {
  @apply mb-3 list-disc pl-6 text-zinc-700 dark:text-zinc-300;
}
.md-preview :deep(ol) {
  @apply mb-3 list-decimal pl-6 text-zinc-700 dark:text-zinc-300;
}
.md-preview :deep(li) {
  @apply mb-1;
}
.md-preview :deep(a) {
  @apply text-accent underline;
}
.md-preview :deep(hr) {
  @apply my-4 border-zinc-200 dark:border-zinc-700;
}
.md-preview :deep(code) {
  @apply rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm dark:bg-zinc-800;
}
.md-preview :deep(pre) {
  @apply mb-3 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-sm text-zinc-100;
}
.md-preview :deep(pre code) {
  @apply bg-transparent p-0;
}
.md-preview :deep(blockquote) {
  @apply mb-3 border-l-4 border-accent pl-4 italic text-zinc-600 dark:text-zinc-400;
}
.md-preview :deep(table) {
  @apply mb-3 w-full border-collapse text-sm;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  @apply border border-zinc-300 px-2 py-1 dark:border-zinc-700;
}
.md-preview :deep(img) {
  @apply max-w-full rounded;
}
</style>
