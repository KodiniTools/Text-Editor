<script setup lang="ts">
import { useToast, type ToastType } from '@/composables/useToast'
import { useI18n } from '@/i18n'

const { toasts, dismiss, muteKey, pause, resume } = useToast()
const { t } = useI18n()

const styleByType: Record<ToastType, string> = {
  success:
    'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  info: 'border-zinc-300 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100',
  error:
    'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
}

const iconByType: Record<ToastType, string> = {
  success: 'M4 8.5l2.8 2.8L12 5.5',
  info: 'M8 7.5v4M8 4.6h.01',
  error: 'M8 4.8v3.6M8 11.2h.01',
}
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 shadow-lg backdrop-blur"
        :class="styleByType[toast.type]"
        role="status"
        @mouseenter="pause(toast.id)"
        @mouseleave="resume(toast.id)"
      >
        <svg viewBox="0 0 16 16" class="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true">
          <circle
            v-if="toast.type !== 'success'"
            cx="8"
            cy="8"
            r="6.4"
            fill="none"
            stroke="currentColor"
            stroke-width="1.3"
          />
          <path
            :d="iconByType[toast.type]"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <div class="min-w-0 flex-1">
          <p class="text-sm leading-snug">{{ toast.message }}</p>
          <button
            v-if="toast.key"
            type="button"
            class="mt-1 text-xs font-medium underline decoration-current/40 underline-offset-2 opacity-80 hover:opacity-100"
            @click="muteKey(toast.key)"
          >
            {{ t.toast.dontShowAgain }}
          </button>
        </div>
        <button
          type="button"
          class="-mr-0.5 flex-shrink-0 rounded p-0.5 text-lg leading-none opacity-60 hover:opacity-100"
          :title="t.toast.dismiss"
          :aria-label="t.toast.dismiss"
          @click="dismiss(toast.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(0.5rem);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(0.75rem);
}
.toast-leave-active {
  position: absolute;
  right: 0;
  width: 100%;
}
</style>
