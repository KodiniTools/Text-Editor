<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { useI18n } from '@/i18n'
import { UiToast } from '@/components/ui'

const { toasts, dismiss, muteKey, pause, resume } = useToast()
const { t } = useI18n()
</script>

<template>
  <div
    class="pointer-events-none fixed bottom-4 right-4 z-toast flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
    aria-live="polite"
    aria-atomic="false"
  >
    <TransitionGroup name="toast">
      <UiToast
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto"
        :message="toast.message"
        :type="toast.type"
        :action-label="toast.key ? t.toast.dontShowAgain : undefined"
        :dismiss-label="t.toast.dismiss"
        @action="toast.key && muteKey(toast.key)"
        @dismiss="dismiss(toast.id)"
        @mouseenter="pause(toast.id)"
        @mouseleave="resume(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--ds-duration) var(--ds-ease),
    transform var(--ds-duration) var(--ds-ease);
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
