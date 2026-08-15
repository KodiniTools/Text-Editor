<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import { useTheme } from '@/composables/useTheme'

const store = useEditorStore()
useTheme(store.settings)
</script>

<template>
  <RouterView />
</template>
