<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { renderMarkdown } from '@/utils/markdown'
import { htmlToMarkdown } from '@/utils/htmlToMarkdown'
import { useI18n } from '@/i18n'
import { useToast } from '@/composables/useToast'
import { UiButton, UiIconButton } from '@/components/ui'

/**
 * Live-Vorschau des Dokuments als Markdown. Der Dokumentinhalt wird zu echtem
 * Markdown umgewandelt (htmlToMarkdown) und daraus gerendert -- so spiegelt die
 * Vorschau sowohl getippte Markdown-Syntax (`# Titel`, `- Punkt`, `**fett**`)
 * als auch die WYSIWYG-Formatierung der Werkzeugleiste (Ueberschriften, Fett,
 * Listen). Genau dieses Markdown liefert auch der `.md`-Export.
 */
const store = useEditorStore()
const { t } = useI18n()
const { showToast } = useToast()

const emit = defineEmits<{ close: [] }>()

const markdown = computed(() => htmlToMarkdown(store.activeHtml))
const html = computed(() => renderMarkdown(markdown.value))
const isEmpty = computed(() => markdown.value.trim() === '')

async function copyMarkdown(): Promise<void> {
  try {
    await navigator.clipboard.writeText(markdown.value)
    showToast(t.value.toast.markdownCopied, { key: 'mdCopy' })
  } catch {
    showToast(t.value.toast.copyFailed, { type: 'error' })
  }
}
</script>

<template>
  <section class="flex min-h-0 flex-col bg-surface-1" :aria-label="t.markdownPreview.title">
    <header class="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
      <span class="text-xs font-semibold uppercase tracking-wide text-ink-2">
        {{ t.markdownPreview.title }}
      </span>
      <div class="flex items-center gap-1">
        <UiButton
          size="sm"
          variant="ghost"
          :disabled="isEmpty"
          :title="t.markdownPreview.copy"
          @click="copyMarkdown"
        >
          {{ t.markdownPreview.copy }}
        </UiButton>
        <UiIconButton size="sm" :label="t.markdownPreview.close" @click="emit('close')">
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
    </header>

    <div class="min-h-0 flex-1 overflow-y-auto">
      <p v-if="isEmpty" class="px-6 py-5 text-sm text-ink-3">
        {{ t.markdownPreview.empty }}
      </p>
      <!-- eslint-disable-next-line vue/no-v-html -- renderMarkdown bereinigt via DOMPurify -->
      <article v-else class="md-preview px-6 py-5" v-html="html" />
    </div>
  </section>
</template>

<style scoped>
/*
 * Basistypografie aus dem Editor uebernehmen (visuelle Kontinuitaet): Schriftart,
 * Groesse, Zeilenabstand und Laufweite kommen aus denselben --editor-*-Variablen
 * wie der Schreiber. Die Struktur (Ueberschriften, Code ...) skaliert relativ
 * (em), also bewegt sich die ganze Vorschau mit, wenn die Groesse geaendert wird.
 * Farbe bleibt bewusst neutral -- Markdown kennt keine Textfarbe.
 */
.md-preview {
  font-family: var(--editor-font);
  font-size: var(--editor-size);
  line-height: var(--editor-line-height);
  letter-spacing: var(--editor-letter-spacing);
}
.md-preview :deep(h1) {
  @apply mb-3 mt-4 font-bold text-ink first:mt-0;
  font-size: 1.6em;
  line-height: 1.25;
}
.md-preview :deep(h2) {
  @apply mb-2 mt-4 font-semibold text-ink first:mt-0;
  font-size: 1.3em;
  line-height: 1.3;
}
.md-preview :deep(h3) {
  @apply mb-2 mt-3 font-semibold text-ink first:mt-0;
  font-size: 1.15em;
  line-height: 1.35;
}
.md-preview :deep(p) {
  @apply mb-3 text-ink-2;
}
.md-preview :deep(ul) {
  @apply mb-3 list-disc pl-6 text-ink-2;
}
.md-preview :deep(ol) {
  @apply mb-3 list-decimal pl-6 text-ink-2;
}
.md-preview :deep(li) {
  @apply mb-1;
}
.md-preview :deep(a) {
  @apply text-link underline;
}
.md-preview :deep(hr) {
  @apply my-4 border-line;
}
.md-preview :deep(code) {
  @apply rounded-sm bg-surface-2 px-1 py-0.5 font-mono;
  font-size: 0.9em;
}
.md-preview :deep(pre) {
  @apply mb-3 overflow-x-auto rounded-md bg-surface-2 p-3 text-ink;
  font-size: 0.9em;
}
.md-preview :deep(pre code) {
  @apply bg-transparent p-0;
  font-size: 1em;
}
.md-preview :deep(blockquote) {
  @apply mb-3 border-l-4 border-accent pl-4 italic text-ink-2;
}
.md-preview :deep(table) {
  @apply mb-3 w-full border-collapse;
  font-size: 0.9em;
}
.md-preview :deep(th),
.md-preview :deep(td) {
  @apply border border-line-strong px-2 py-1;
}
.md-preview :deep(img) {
  @apply max-w-full rounded-sm;
}
</style>
