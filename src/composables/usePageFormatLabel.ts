import { computed, type ComputedRef } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useI18n } from '@/i18n'
import { PAGE_FORMATS } from '@/utils/pageFormats'

/**
 * Menschlich lesbares Zielformat des Exports, z. B. "A4 · Hochformat".
 *
 * Im Modus "Bildschirm" (kein Papierformat) faellt der Export auf A4 Hochformat
 * zurueck -- das wird als "A4 · Hochformat (Standard)" kenntlich gemacht, damit
 * der Nutzer weiss, was beim Speichern/Drucken herauskommt.
 */
export function usePageFormatLabel(): ComputedRef<string> {
  const store = useEditorStore()
  const { t } = useI18n()

  return computed(() => {
    const s = store.settings
    const fmt = PAGE_FORMATS.find((f) => f.id === s.pageFormat)
    if (!fmt) {
      return `A4 · ${t.value.format.orientationPortrait} ${t.value.format.pageDefaultHint}`
    }
    const orientation =
      s.pageOrientation === 'landscape'
        ? t.value.format.orientationLandscape
        : t.value.format.orientationPortrait
    return `${fmt.label} · ${orientation}`
  })
}
