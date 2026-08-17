<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'
import type { Messages } from '@/i18n/messages'

const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()

type ShortcutKey = keyof Omit<
  Messages['shortcuts'],
  'title' | 'intro' | 'close' | 'modKey' | 'altKey' | 'groups'
>
type GroupKey = keyof Messages['shortcuts']['groups']

/** Ein Kuerzel: Beschriftung + eine oder mehrere gleichwertige Kombinationen. */
interface Row {
  label: ShortcutKey
  combos: string[][]
}

/**
 * Die Kuerzel je Gruppe. Modifikatoren als Kleinschrift-Token (`mod`, `shift`,
 * `alt`), Haupttasten als anzeigefertige Zeichen -- so bleibt die Liste die eine
 * Quelle und deckt sich mit der Belegung in EditorView.
 */
const GROUPS: { id: GroupKey; rows: Row[] }[] = [
  {
    id: 'file',
    rows: [
      { label: 'newDoc', combos: [['mod', 'M']] },
      { label: 'openFile', combos: [['mod', 'O']] },
      { label: 'saveTxt', combos: [['mod', 'S']] },
      { label: 'exportPdf', combos: [['mod', 'shift', 'S']] },
      { label: 'print', combos: [['mod', 'P']] },
      { label: 'switchDoc', combos: [['alt', '1 … 9']] },
    ],
  },
  {
    id: 'edit',
    rows: [
      { label: 'undo', combos: [['mod', 'Z']] },
      {
        label: 'redo',
        combos: [
          ['mod', 'Y'],
          ['mod', 'shift', 'Z'],
        ],
      },
      { label: 'selectAll', combos: [['mod', 'A']] },
      { label: 'find', combos: [['mod', 'F']] },
      { label: 'findNext', combos: [['mod', 'G']] },
      { label: 'findPrev', combos: [['mod', 'shift', 'G']] },
    ],
  },
  {
    id: 'format',
    rows: [
      { label: 'bold', combos: [['mod', 'B']] },
      { label: 'italic', combos: [['mod', 'I']] },
      { label: 'underline', combos: [['mod', 'U']] },
      { label: 'strikethrough', combos: [['mod', 'shift', 'X']] },
      { label: 'highlight', combos: [['mod', 'shift', 'H']] },
      { label: 'link', combos: [['mod', 'K']] },
      { label: 'clearFormat', combos: [['mod', '\\']] },
      { label: 'fontBigger', combos: [['mod', 'shift', '.']] },
      { label: 'fontSmaller', combos: [['mod', 'shift', ',']] },
      { label: 'indent', combos: [['Tab']] },
    ],
  },
  {
    id: 'blocks',
    rows: [
      { label: 'normalText', combos: [['mod', 'alt', '0']] },
      { label: 'heading1', combos: [['mod', 'alt', '1']] },
      { label: 'heading2', combos: [['mod', 'alt', '2']] },
      { label: 'heading3', combos: [['mod', 'alt', '3']] },
      { label: 'quote', combos: [['mod', 'shift', '9']] },
      { label: 'bulletList', combos: [['mod', 'shift', '8']] },
      { label: 'numberedList', combos: [['mod', 'shift', '7']] },
    ],
  },
  {
    id: 'view',
    rows: [
      { label: 'focus', combos: [['mod', 'shift', 'F']] },
      { label: 'exit', combos: [['Esc']] },
      { label: 'help', combos: [['mod', '/'], ['F1']] },
    ],
  },
]

// macOS beschriftet die Modifikatoren mit eigenen Zeichen.
const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '')

const modLabel = computed(() => (isMac ? '⌘' : t.value.shortcuts.modKey))
const altLabel = computed(() => (isMac ? '⌥' : t.value.shortcuts.altKey))
const shiftLabel = computed(() => (isMac ? '⇧' : 'Shift'))

function keyLabel(token: string): string {
  if (token === 'mod') return modLabel.value
  if (token === 'shift') return shiftLabel.value
  if (token === 'alt') return altLabel.value
  return token
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      :aria-label="t.shortcuts.title"
      @click.self="emit('close')"
    >
      <div
        class="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div
          class="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800"
        >
          <div>
            <h2 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {{ t.shortcuts.title }}
            </h2>
            <p class="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{{ t.shortcuts.intro }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            :title="t.shortcuts.close"
            :aria-label="t.shortcuts.close"
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
        </div>

        <div class="grid gap-x-8 gap-y-5 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <section v-for="group in GROUPS" :key="group.id">
            <h3
              class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500"
            >
              {{ t.shortcuts.groups[group.id] }}
            </h3>
            <ul class="space-y-1.5">
              <li
                v-for="row in group.rows"
                :key="row.label"
                class="flex items-center justify-between gap-3"
              >
                <span class="text-sm text-zinc-700 dark:text-zinc-300">{{
                  t.shortcuts[row.label]
                }}</span>
                <span class="flex shrink-0 items-center gap-1">
                  <template v-for="(combo, ci) in row.combos" :key="ci">
                    <span v-if="ci > 0" class="text-xs text-zinc-400">/</span>
                    <kbd v-for="(token, ki) in combo" :key="ki" class="kbd">{{
                      keyLabel(token)
                    }}</kbd>
                  </template>
                </span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.kbd {
  @apply inline-flex min-w-[1.5rem] items-center justify-center rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-600 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300;
}
</style>
