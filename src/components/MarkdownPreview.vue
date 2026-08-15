<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { renderMarkdown } from '@/utils/markdown'

const store = useEditorStore()
const html = computed(() => renderMarkdown(store.activeContent))
</script>

<template>
  <div
    class="h-full overflow-y-auto border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <article class="md-preview px-6 py-5" v-html="html" />
  </div>
</template>

<style scoped>
.md-preview :deep(h1) {
  @apply mb-3 mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50;
}
.md-preview :deep(h2) {
  @apply mb-2 mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50;
}
.md-preview :deep(h3) {
  @apply mb-2 mt-3 text-lg font-semibold text-zinc-800 dark:text-zinc-100;
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
.md-preview :deep(a) {
  @apply text-accent underline;
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
</style>
