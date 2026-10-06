<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useI18n } from '@/i18n'
import { useToast } from '@/composables/useToast'

const store = useEditorStore()
const { t } = useI18n()
const { showToast } = useToast()

function closeDocument(id: string): void {
  store.closeDocument(id)
  showToast(t.value.toast.closed, { type: 'info', key: 'close' })
}
const editingId = ref<string | null>(null)
const editValue = ref('')
const editInput = ref<HTMLInputElement | null>(null)

function startEdit(id: string, name: string): void {
  editingId.value = id
  editValue.value = name
  nextTick(() => editInput.value?.select())
}

function commitEdit(): void {
  if (editingId.value) store.renameDocument(editingId.value, editValue.value)
  editingId.value = null
}
</script>

<template>
  <div
    class="hbar-scroll flex items-center gap-1 overflow-x-auto border-b border-line bg-surface-2 px-2"
  >
    <button
      v-for="doc in store.documents"
      :key="doc.id"
      type="button"
      class="group flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors"
      :class="
        doc.id === store.activeId
          ? 'border-accent text-accent'
          : 'border-transparent text-ink-2 hover:text-ink'
      "
      @click="store.switchDocument(doc.id)"
      @dblclick="startEdit(doc.id, store.documentTitle(doc))"
    >
      <input
        v-if="editingId === doc.id"
        ref="editInput"
        v-model="editValue"
        class="w-28 rounded-sm border border-accent bg-surface-1 px-1 text-sm text-ink outline-none focus-visible:shadow-focus"
        :placeholder="t.tabs.renamePlaceholder"
        @click.stop
        @keydown.enter.prevent="commitEdit"
        @keydown.esc.prevent="editingId = null"
        @blur="commitEdit"
      />
      <span v-else class="max-w-40 truncate" :title="t.tabs.renameTitle">{{
        store.documentTitle(doc)
      }}</span>
      <!-- Umbenennen: sichtbarer Hinweis (zusaetzlich zum Doppelklick).
           `tab-action`: auf Touch-Geraeten (kein Hover) dauerhaft sichtbar. -->
      <span
        v-if="editingId !== doc.id"
        class="tab-action rounded-sm px-1 text-xs text-ink-3 opacity-0 hover:bg-surface-3 hover:text-ink-2 group-hover:opacity-100"
        role="button"
        :title="t.tabs.renameTitle"
        :aria-label="t.tabs.renameTitle"
        @click.stop="startEdit(doc.id, store.documentTitle(doc))"
        >✎</span
      >
      <span
        v-if="store.documents.length > 1 && editingId !== doc.id"
        class="tab-action rounded-sm px-1 text-xs text-ink-3 opacity-0 hover:bg-surface-3 hover:text-ink-2 group-hover:opacity-100"
        role="button"
        :title="t.tabs.closeTitle"
        :aria-label="t.tabs.closeTitle"
        @click.stop="closeDocument(doc.id)"
        >✕</span
      >
    </button>

    <button
      type="button"
      class="shrink-0 px-3 py-2 text-lg text-ink-3 hover:text-accent"
      :title="t.tabs.newDocTitle"
      @click="store.newDocument()"
    >
      +
    </button>
  </div>
</template>
