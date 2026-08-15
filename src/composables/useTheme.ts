import { watch } from 'vue'
import type { EditorSettings } from '@/stores/editor'

const FONT_MAP: Record<EditorSettings['fontFamily'], string> = {
  sans: 'ui-sans-serif, system-ui, sans-serif',
  serif: 'ui-serif, Georgia, Cambria, serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
}

/**
 * Wendet Theme (hell/dunkel/system) und Editor-Schriftart auf das <html>-Element an.
 * Reagiert auf System-Aenderungen wenn Modus 'system'.
 */
export function useTheme(settings: EditorSettings) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')

  function apply(): void {
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.style.setProperty('--editor-font', FONT_MAP[settings.fontFamily])
  }

  media.addEventListener('change', apply)
  watch(() => [settings.theme, settings.fontFamily], apply, { immediate: true })

  return { apply }
}
