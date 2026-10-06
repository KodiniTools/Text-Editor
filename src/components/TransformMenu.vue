<script setup lang="ts">
import { transformGroups } from '@/utils/transformRegistry'
import type { Transform } from '@/utils/textTransforms'
import { useI18n } from '@/i18n'
import { useAnchoredMenu } from '@/composables/useAnchoredMenu'

const emit = defineEmits<{ apply: [fn: Transform] }>()

const { t } = useI18n()

// Menue haengt an seinem Knopf und liegt per Teleport im #modal-portal, damit es
// in der (auf Mobile horizontal scrollenden) Werkzeugleiste nicht abgeschnitten
// wird und ueber der globalen Navigation liegt.
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

  <Teleport to="#modal-portal">
    <div
      v-if="open"
      ref="menuEl"
      class="fixed z-dialog w-64 overflow-y-auto rounded-md border border-line bg-surface-1 p-2 shadow-overlay"
      :style="style"
    >
      <p class="px-2 pb-1 text-xs text-ink-3">{{ t.transformMenu.hint }}</p>
      <div v-for="group in transformGroups" :key="group.id" class="mb-2">
        <p class="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-ink-3">
          {{ t.transformGroups[group.id] }}
        </p>
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="menu-item hover:bg-accent-soft hover:text-accent"
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
  @apply flex items-center gap-1 rounded-sm px-3 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-surface-2;
}
.menu-item {
  @apply block w-full rounded-sm px-2 py-1.5 text-left text-sm text-ink-2;
}
</style>
