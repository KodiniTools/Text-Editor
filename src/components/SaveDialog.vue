<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { UiButton, UiCallout, UiDialog, UiTextField } from '@/components/ui'
import { useSaveDialog } from '@/composables/useSaveDialog'
import { safeFileName } from '@/utils/exportPdf'
import { stripExt } from '@/utils/saveFile'

/**
 * "Speichern unter": Dateiname bearbeiten, dann Speicherort waehlen (Browser mit
 * File System Access API) oder herunterladen (alle anderen -- mit Hinweis).
 * Einmal in EditorView eingehaengt; Aufrufer nutzen useSaveDialog().requestSave.
 */
const { t } = useI18n()
const { pending, canPickLocation, confirm, cancel } = useSaveDialog()

const FIELD_ID = 'save-dialog-name'
const name = ref('')
const busy = ref(false)

watch(
  () => pending.value,
  async (req) => {
    if (!req) return
    name.value = req.base
    busy.value = false
    await nextTick()
    const el = document.getElementById(FIELD_ID) as HTMLInputElement | null
    el?.focus()
    el?.select()
  },
)

const ext = computed(() => pending.value?.ext ?? 'txt')
const isEmpty = computed(() => stripExt(name.value, ext.value).trim() === '')
/** Vorschau des endgueltigen Dateinamens (bereinigt, mit Endung). */
const resultName = computed(() => `${safeFileName(stripExt(name.value, ext.value))}.${ext.value}`)

async function submit(): Promise<void> {
  if (busy.value || isEmpty.value) return
  busy.value = true
  try {
    await confirm(name.value)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <UiDialog
    :open="pending !== null"
    teleport-to="#modal-portal"
    :title="t.saveDialog.title"
    :description="canPickLocation ? t.saveDialog.introPicker : t.saveDialog.introDownload"
    :close-label="t.saveDialog.cancel"
    @close="cancel"
  >
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <UiTextField
        :id="FIELD_ID"
        v-model="name"
        :label="t.saveDialog.nameLabel"
        :hint="t.saveDialog.nameHint(resultName)"
        :error="isEmpty ? t.saveDialog.nameEmpty : undefined"
        autocomplete="off"
        spellcheck="false"
        maxlength="120"
      />
      <UiCallout v-if="!canPickLocation" type="info">
        {{ t.saveDialog.unsupported }}
      </UiCallout>
    </form>
    <template #footer>
      <UiButton variant="ghost" :disabled="busy" @click="cancel">
        {{ t.saveDialog.cancel }}
      </UiButton>
      <UiButton variant="primary" :disabled="busy || isEmpty" @click="submit">
        {{ canPickLocation ? t.saveDialog.pickLocation : t.saveDialog.download }}
      </UiButton>
    </template>
  </UiDialog>
</template>
