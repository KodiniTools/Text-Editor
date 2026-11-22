<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { printImageStyle, printRootStyle } from '@/utils/printLayout'

/**
 * Druckausgabe des aktiven Dokuments (#print-root). Am Bildschirm ausgeblendet,
 * beim Drucken das einzig Sichtbare (siehe @media print in style.css). Wird in
 * jeder Ansicht eingebunden, die "Drucken" anbietet (Editor und Vorschau);
 * ohne diesen Container druckt der Browser eine leere Seite.
 *
 * Nutzt dieselben --editor-*-Variablen wie der Editor, damit Schrift, Groesse,
 * Zeilenabstand, Laufweite und Ausrichtung mitgedruckt werden. Die
 * Papiergroesse steuert die @page-Regel der jeweiligen Ansicht.
 */
const store = useEditorStore()

// Bereinigtes HTML der aktiven Seite (inkl. Inline-Fett/Kursiv/Farbe).
const printHtml = computed(() => store.activeHtml)
// Frei platzierte Bilder liegen nicht im HTML, sondern separat im Store -- fuer
// den Druck absolut im Container platzieren.
const printImages = computed(() => store.activeImages)
const printStyle = computed(() => printRootStyle(printImages.value))
</script>

<template>
  <div id="print-root" aria-hidden="true" :style="printStyle">
    <!-- eslint-disable-next-line vue/no-v-html -- Inhalt ist bereits bereinigt (store.activeHtml) -->
    <div v-html="printHtml" />
    <img
      v-for="img in printImages"
      :key="img.id"
      :src="img.src"
      alt=""
      :style="printImageStyle(img)"
    />
  </div>
</template>
