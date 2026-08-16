<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

/**
 * Kompakter Zahlenregler fuer die Format-Leiste: Wert + gestapelte Pfeile
 * (▲/▼) daneben. Spart Breite gegenueber den frueheren [-]/[+]-Knoepfen an
 * beiden Seiten. Der Wert bleibt immer innerhalb von min/max.
 */
const props = withDefaults(
  defineProps<{
    modelValue: number
    min: number
    max: number
    step?: number
    /** Nachkommastellen der Anzeige. */
    decimals?: number
    /** Einheit hinter dem Wert, z. B. 'px'. */
    unit?: string
    label: string
    width?: string
  }>(),
  { step: 1, decimals: 0, unit: '', width: '3.25rem' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()

const display = computed(() => props.modelValue.toFixed(props.decimals) + props.unit)
const canDecrease = computed(() => props.modelValue > props.min)
const canIncrease = computed(() => props.modelValue < props.max)

const decreaseLabel = computed(() => t.value.stepper.decrease(props.label))
const increaseLabel = computed(() => t.value.stepper.increase(props.label))

function nudge(direction: 1 | -1): void {
  const next = props.modelValue + direction * props.step
  // Schrittweiten wie 0.1 erzeugen sonst Werte wie 1.7000000000000002.
  const rounded = Math.round(next * 1000) / 1000
  emit('update:modelValue', Math.min(props.max, Math.max(props.min, rounded)))
}
</script>

<template>
  <div class="flex items-center gap-1" role="group" :aria-label="label">
    <span
      class="text-right text-xs tabular-nums text-zinc-600 dark:text-zinc-300"
      :style="{ minWidth: width }"
      aria-live="polite"
      >{{ display }}</span
    >
    <span
      class="spin flex flex-col overflow-hidden rounded border border-zinc-300 dark:border-zinc-600"
    >
      <button
        type="button"
        class="spin-btn border-b border-zinc-300 dark:border-zinc-600"
        :disabled="!canIncrease"
        :title="increaseLabel"
        :aria-label="increaseLabel"
        @click="nudge(1)"
      >
        <svg viewBox="0 0 10 6" class="h-1.5 w-2.5" aria-hidden="true">
          <path
            d="M1 5 L5 1.5 L9 5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="spin-btn"
        :disabled="!canDecrease"
        :title="decreaseLabel"
        :aria-label="decreaseLabel"
        @click="nudge(-1)"
      >
        <svg viewBox="0 0 10 6" class="h-1.5 w-2.5" aria-hidden="true">
          <path
            d="M1 1 L5 4.5 L9 1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </span>
  </div>
</template>

<style scoped>
.spin-btn {
  @apply flex h-[13px] w-5 items-center justify-center text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-30 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-100;
}
</style>
