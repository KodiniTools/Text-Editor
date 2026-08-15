<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()
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
    class="flex items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-zinc-100 px-2 dark:border-zinc-800 dark:bg-zinc-950"
  >
    <button
      v-for="doc in store.documents"
      :key="doc.id"
      type="button"
      class="group flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors"
      :class="
        doc.id === store.activeId
          ? 'border-accent text-accent'
          : 'border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      "
      @click="store.switchDocument(doc.id)"
      @dblclick="startEdit(doc.id, doc.name)"
    >
      <input
        v-if="editingId === doc.id"
        ref="editInput"
        v-model="editValue"
        class="w-28 rounded border border-accent bg-white px-1 text-sm text-zinc-900 outline-none dark:bg-zinc-800 dark:text-zinc-100"
        @click.stop
        @keydown.enter.prevent="commitEdit"
        @keydown.esc.prevent="editingId = null"
        @blur="commitEdit"
      />
      <span v-else class="max-w-40 truncate">{{ doc.name }}</span>
      <span
        v-if="store.documents.length > 1"
        class="rounded px-1 text-xs text-zinc-400 opacity-0 hover:bg-zinc-300 hover:text-zinc-700 group-hover:opacity-100 dark:hover:bg-zinc-700"
        role="button"
        title="Schliessen"
        @click.stop="store.closeDocument(doc.id)"
        >✕</span
      >
    </button>

    <button
      type="button"
      class="shrink-0 px-3 py-2 text-lg text-zinc-500 hover:text-accent"
      title="Neues Dokument (Strg+M)"
      @click="store.newDocument()"
    >
      +
    </button>
  </div>
</template>
