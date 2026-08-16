<script setup lang="ts">
import { useEditorStore } from '@/stores/editor'
import { useTheme } from '@/composables/useTheme'
import { discoverFonts } from '@/config/fonts'
import ToastHost from '@/components/ToastHost.vue'

const store = useEditorStore()
useTheme(store.settings)

// Schriften aus /public/fonts nachladen (Liste kommt aus fonts.json neben
// der index.html). Fehlt die Datei, bleibt es bei den Systemschriften.
void discoverFonts(import.meta.env.BASE_URL)
</script>

<template>
  <RouterView />
  <ToastHost />
</template>
