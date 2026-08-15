import { watch } from 'vue'
import type { EditorSettings } from '@/stores/editor'
import { findFont, fontList, loadFont } from '@/config/fonts'

/**
 * Spiegelt Design und Textdarstellung auf das <html>-Element.
 *
 * Die Darstellung laeuft ueber CSS-Variablen, damit Editor und Vorschau
 * dieselbe Quelle nutzen und kein Bauteil die Werte doppelt kennt.
 * Reagiert auf System-Aenderungen, wenn der Modus 'system' ist.
 */
export function useTheme(settings: EditorSettings) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const root = document.documentElement

  function applyTheme(): void {
    const dark = settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
    root.classList.toggle('dark', dark)
  }

  function applyTypography(): void {
    const font = findFont(settings.fontFamily)
    root.style.setProperty('--editor-font', font.stack)
    root.style.setProperty('--editor-size', `${settings.fontSize}px`)
    root.style.setProperty('--editor-line-height', String(settings.lineHeight))
    root.style.setProperty('--editor-letter-spacing', `${settings.letterSpacing}px`)
    root.style.setProperty('--editor-align', settings.textAlign)
    // Leere Farbe -> die Variable wird entfernt, dann greift der Theme-Wert.
    if (settings.textColor) root.style.setProperty('--editor-color', settings.textColor)
    else root.style.removeProperty('--editor-color')

    // Eigene Schriften liegen als Datei vor und werden erst bei Auswahl geladen.
    void loadFont(font)
  }

  media.addEventListener('change', applyTheme)
  watch(() => settings.theme, applyTheme, { immediate: true })
  watch(
    () => [
      settings.fontFamily,
      settings.fontSize,
      settings.lineHeight,
      settings.letterSpacing,
      settings.textColor,
      settings.textAlign,
      // Schriften vom Server kommen nachtraeglich dazu: sobald die gespeicherte
      // Auswahl darunter ist, muss der Stack neu gesetzt werden.
      fontList.value.length,
    ],
    applyTypography,
    { immediate: true },
  )

  return { applyTheme, applyTypography }
}
