<script setup lang="ts">
import { transformGroups } from '@/utils/transformRegistry'
import type { Transform } from '@/utils/textTransforms'
import { useI18n } from '@/i18n'
import { useAnchoredMenu } from '@/composables/useAnchoredMenu'

const emit = defineEmits<{ apply: [fn: Transform] }>()

const { t } = useI18n()

// Menue haengt an seinem Knopf und liegt per Teleport im <body>, damit es in der
// (auf Mobile horizontal scrollenden) Werkzeugleiste nicht abgeschnitten wird.
const { open, anchorEl, menuEl, style, toggle, close } = useAnchoredMenu(256)

function choose(fn: Transform): void {
  emit('apply', fn)
  close()
}
</script>

<template>
  <button ref="anchorEl" type="button" class="tb-btn" :aria-expanded="open" @click="toggle">
    {{ t.toolbar.tools }}
    <span class="text-xs">▾</span>
  </button>

  <Teleport to="body">
    <div
      v-if="open"
      ref="menuEl"
      class="fixed z-50 w-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      :style="style"
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
          class="menu-item hover:bg-accent-soft hover:text-accent dark:hover:bg-zinc-700"
          @click="choose(item.fn)"
        >
          {{ t.transforms[item.id] }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.tb-btn {
  @apply flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800;
}
.menu-item {
  @apply block w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-700 dark:text-zinc-200;
}
</style>
