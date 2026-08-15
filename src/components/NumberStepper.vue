<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { t } = useI18n()

/**
 * Kompakter Zahlenregler fuer die Format-Leiste: [-] Wert [+].
 * Der Wert bleibt immer innerhalb von min/max.
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
    <button
      type="button"
      class="step-btn"
      :disabled="!canDecrease"
      :title="decreaseLabel"
      :aria-label="decreaseLabel"
      @click="nudge(-1)"
    >
      &minus;
    </button>
    <span
      class="text-center text-xs tabular-nums text-zinc-600 dark:text-zinc-300"
      :style="{ minWidth: width }"
      aria-live="polite"
      >{{ display }}</span
    >
    <button
      type="button"
      class="step-btn"
      :disabled="!canIncrease"
      :title="increaseLabel"
      :aria-label="increaseLabel"
      @click="nudge(1)"
    >
      +
    </button>
  </div>
</template>

<style scoped>
.step-btn {
  @apply flex h-6 w-6 items-center justify-center rounded border border-zinc-300 text-sm leading-none text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700;
}
</style>
