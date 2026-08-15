import { watch } from 'vue'
import type { EditorSettings } from '@/stores/editor'
import { findFont, fontList, loadFont } from '@/config/fonts'

/** Gemeinsamer Theme-Schluessel mit der globalen Navigation. */
const THEME_KEY = 'theme'

/**
 * Spiegelt Design und Textdarstellung auf das <html>-Element.
 *
 * Die Darstellung laeuft ueber CSS-Variablen, damit Editor und Vorschau
 * dieselbe Quelle nutzen und kein Bauteil die Werte doppelt kennt.
 * Reagiert auf System-Aenderungen, wenn der Modus 'system' ist.
 *
 * Bruecke zur globalen Seite: Navigation, Footer und Cookie-Banner stylen sich
 * ueber `[data-theme]` und den Umschalter der Navigation ueber
 * `localStorage['theme']`. Deshalb setzt der Editor zusaetzlich zum
 * Tailwind-`.dark` auch `data-theme` und uebernimmt einen Wechsel, der von der
 * Navigation kommt (beobachtet ueber einen MutationObserver).
 */
export function useTheme(settings: EditorSettings) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const root = document.documentElement

  // Verhindert, dass der Observer die eigenen data-theme-Aenderungen als
  // externen Wechsel missversteht.
  let applyingTheme = false

  function isDark(): boolean {
    return settings.theme === 'dark' || (settings.theme === 'system' && media.matches)
  }

  // Startet der Editor ohne eigene Wahl (Standard 'system'), aber die Seite hat
  // global schon ein Theme gesetzt, dieses uebernehmen -- so bleibt die Ansicht
  // ueber Seitenwechsel hinweg konsistent.
  try {
    const shared = localStorage.getItem(THEME_KEY)
    if (settings.theme === 'system' && (shared === 'dark' || shared === 'light')) {
      settings.theme = shared
    }
  } catch {
    /* localStorage evtl. blockiert */
  }

  function applyTheme(): void {
    const dark = isDark()
    applyingTheme = true
    root.classList.toggle('dark', dark)
    root.setAttribute('data-theme', dark ? 'dark' : 'light')
    // Nur eine bewusste Wahl (nicht 'system') global weitergeben, damit die
    // Auto-Einstellung nicht ungewollt zu einem festen Wert einfriert.
    if (settings.theme !== 'system') {
      try {
        localStorage.setItem(THEME_KEY, settings.theme)
      } catch {
        /* ignore */
      }
    }
    applyingTheme = false
  }

  // Wechsel aus der globalen Navigation (setzt data-theme direkt) uebernehmen.
  const observer = new MutationObserver(() => {
    if (applyingTheme) return
    const attr = root.getAttribute('data-theme')
    if (attr !== 'dark' && attr !== 'light') return
    if ((attr === 'dark') !== isDark()) settings.theme = attr
  })
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

  function applyTypography(): void {
    const font = findFont(settings.fontFamily)
    root.style.setProperty('--editor-font', font.stack)
    // Schnitt der gewaehlten Schrift (Bold, Light, ...). Systemschriften ohne
    // Angabe bleiben bei normalem Gewicht.
    root.style.setProperty('--editor-weight', font.weight ?? '400')
    root.style.setProperty('--editor-style', font.style ?? 'normal')
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
