<template>
  <span class="ui-kbd-group">
    <kbd v-for="key in keys" :key="key" class="ui-kbd">{{ key }}</kbd>
  </span>
</template>

<script setup lang="ts">
/** Tastenkombination, z. B. :keys="['Strg', 'S']". */
defineProps<{
  keys: string[]
}>()
</script>

<style scoped>
.ui-kbd-group {
  display: inline-flex;
  gap: var(--ds-space-1);
}

.ui-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 22px;
  padding: 0 calc(var(--ds-space-1) + 2px);
  box-sizing: border-box;
  border: var(--ds-border-width) solid var(--ds-border-strong);
  border-bottom-width: 2px;
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface-2);
  color: var(--ds-text);
  font-family: inherit;
  font-size: var(--ds-text-xs);
  font-weight: var(--ds-weight-semibold);
  line-height: 1;
  white-space: nowrap;
}
</style>
