<script setup lang="ts">
import { watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { useI18n } from '@/i18n'
import { useToast } from '@/composables/useToast'

/**
 * Registriert den Service Worker und zeigt zwei dezente Hinweise:
 *  - "offline verfuegbar" als kurzer Toast (einmalig, ausblendbar).
 *  - "neue Version" als kleines Banner mit "Neu laden" -- bewusst als Angebot,
 *    damit kein Update mitten im Tippen ungefragt neu laedt.
 * Die Nutzerdaten liegen im localStorage und ueberstehen das Neuladen.
 */
const { t } = useI18n()
const { showToast } = useToast()

const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

watch(offlineReady, (ready) => {
  if (ready) showToast(t.value.pwa.offlineReady, { type: 'info', key: 'pwaOffline' })
})

function reload(): void {
  void updateServiceWorker(true)
}
function dismiss(): void {
  needRefresh.value = false
}
</script>

<template>
  <Teleport to="body">
    <div v-if="needRefresh" class="fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
      <div
        class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
        role="status"
      >
        <span class="text-sm text-zinc-700 dark:text-zinc-200">{{ t.pwa.updateAvailable }}</span>
        <button
          type="button"
          class="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          @click="reload"
        >
          {{ t.pwa.reload }}
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
          @click="dismiss"
        >
          {{ t.pwa.dismiss }}
        </button>
      </div>
    </div>
  </Teleport>
</template>
