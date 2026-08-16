import { onBeforeUnmount, onMounted } from 'vue'

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>

/**
 * Bestimmt die "Haupttaste" einer Tastatureingabe layout-unabhaengig.
 *
 * Bewusst ueber `e.code` (physische Taste) statt `e.key`: so liefert `Alt+1` auf
 * macOS (wo `e.key` das Sonderzeichen `¡` waere) trotzdem `1`, und `Strg+Shift+.`
 * bleibt `.` statt `>`. Fuer Tasten ohne stabilen Code (Esc, F1, Pfeile) faellt
 * die Funktion auf `e.key` zurueck.
 */
const PUNCT_BY_CODE: Record<string, string> = {
  Period: '.',
  Comma: ',',
  Slash: '/',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  BracketLeft: '[',
  BracketRight: ']',
}

function mainKey(e: KeyboardEvent): string {
  const code = e.code || ''
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]!.toLowerCase()
  const digit = /^Digit(\d)$/.exec(code)
  if (digit) return digit[1]!
  if (PUNCT_BY_CODE[code]) return PUNCT_BY_CODE[code]!
  const key = (e.key || '').toLowerCase()
  return key === 'escape' ? 'esc' : key
}

/**
 * Baut aus einem KeyboardEvent den Kombinations-String, z. B. "mod+shift+z".
 * "mod" = Strg (Win/Linux) bzw. Cmd (Mac). Reihenfolge fest: mod, shift, alt.
 */
export function comboFromEvent(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('mod')
  if (e.shiftKey) parts.push('shift')
  if (e.altKey) parts.push('alt')
  parts.push(mainKey(e))
  return parts.join('+')
}

/**
 * Registriert globale Tastenkuerzel.
 * Key-Format: "mod+f", "mod+shift+z", "alt+1", "esc". "mod" = Strg bzw. Cmd.
 */
export function useKeyboardShortcuts(map: ShortcutMap) {
  function handler(e: KeyboardEvent): void {
    const fn = map[comboFromEvent(e)]
    if (fn) {
      e.preventDefault()
      fn(e)
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
}
