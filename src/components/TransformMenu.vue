<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { transformGroups } from '@/utils/transformRegistry'
import type { Transform } from '@/utils/textTransforms'
import { useI18n } from '@/i18n'

const emit = defineEmits<{ apply: [fn: Transform] }>()

const { t } = useI18n()

const open = ref(false)
const root = ref<HTMLElement | null>(null)

function choose(fn: Transform): void {
  emit('apply', fn)
  open.value = false
}

function onClickOutside(e: MouseEvent): void {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('click', onClickOutside))
onBeforeUnmount(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="root" class="relative">
    <button type="button" class="tb-btn" @click="open = !open">
      {{ t.toolbar.tools }}
      <span class="text-xs">▾</span>
    </button>

    <div
      v-if="open"
      class="absolute left-0 z-20 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
    >
      <p class="px-2 pb-1 text-xs text-zinc-400">{{ t.transformMenu.hint }}</p>
      <div v-for="group in transformGroups" :key="group.id" class="mb-2">
        <p class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {{ t.transformGroups[group.id] }}
        </p>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="block w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 hover:bg-accent-soft hover:text-accent dark:text-zinc-200 dark:hover:bg-zinc-700"
          @click="choose(item.fn)"
        >
          {{ t.transforms[item.id] }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tb-btn {
  @apply flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800;
}
</style>
