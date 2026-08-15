<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts'
import { useI18n } from '@/i18n'
import type { EditorApi } from '@/types'
import type { Transform } from '@/utils/textTransforms'

import DocumentTabs from '@/components/DocumentTabs.vue'
import EditorToolbar from '@/components/EditorToolbar.vue'
import FormatBar from '@/components/FormatBar.vue'
import EditorArea from '@/components/EditorArea.vue'
import FindReplace from '@/components/FindReplace.vue'
import MarkdownPreview from '@/components/MarkdownPreview.vue'
import StatusBar from '@/components/StatusBar.vue'

const store = useEditorStore()
const { t } = useI18n()

const editorAreaRef = ref<InstanceType<typeof EditorArea> | null>(null)
const findRef = ref<InstanceType<typeof FindReplace> | null>(null)
const toolbarRef = ref<InstanceType<typeof EditorToolbar> | null>(null)

const editorApi = computed<EditorApi | null>(() => editorAreaRef.value)

const showFind = ref(false)
const cursorLine = ref(1)
const cursorCol = ref(1)

function onTransform(fn: Transform): void {
  editorApi.value?.applyTransform(fn)
}

function onCursor(line: number, col: number): void {
  cursorLine.value = line
  cursorCol.value = col
}

function openFind(): void {
  showFind.value = true
  nextTick(() => findRef.value?.focus())
}

function toggleFind(): void {
  if (showFind.value) {
    showFind.value = false
    editorApi.value?.focusEditor()
  } else {
    openFind()
  }
}

useKeyboardShortcuts({
  'mod+f': openFind,
  esc: () => {
    if (showFind.value) {
      showFind.value = false
      editorApi.value?.focusEditor()
    }
  },
  'mod+m': () => store.newDocument(),
  'mod+z': () => store.undo(),
  'mod+y': () => store.redo(),
  'mod+shift+z': () => store.redo(),
  'mod+s': () => toolbarRef.value?.download('txt'),
})
</script>

<template>
  <div class="flex h-full flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <template v-if="!store.settings.focusMode">
      <DocumentTabs />
      <EditorToolbar ref="toolbarRef" @transform="onTransform" @toggle-find="toggleFind" />
      <FormatBar v-if="store.settings.showFormatBar" />
    </template>

    <FindReplace v-if="showFind" ref="findRef" :editor="editorApi" @close="toggleFind" />

    <div class="flex min-h-0 flex-1">
      <div class="min-w-0 flex-1">
        <EditorArea ref="editorAreaRef" class="h-full" @cursor="onCursor" />
      </div>
      <div v-if="store.settings.showPreview && !store.settings.focusMode" class="min-w-0 flex-1">
        <MarkdownPreview />
      </div>
    </div>

    <StatusBar v-if="!store.settings.focusMode" :cursor-line="cursorLine" :cursor-col="cursorCol" />

    <button
      v-if="store.settings.focusMode"
      type="button"
      class="fixed right-4 top-4 z-30 rounded-full bg-zinc-800/80 px-4 py-2 text-sm text-white shadow-lg backdrop-blur hover:bg-zinc-700"
      @click="store.updateSettings({ focusMode: false })"
    >
      {{ t.focusOverlay.exit }}
    </button>
  </div>
</template>
