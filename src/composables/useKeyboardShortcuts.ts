import { onBeforeUnmount, onMounted } from 'vue'

export type ShortcutMap = Record<string, (e: KeyboardEvent) => void>

/**
 * Registriert globale Tastenkuerzel.
 * Key-Format: "mod+f", "mod+shift+z", "esc". "mod" = Strg (Win/Linux) bzw. Cmd (Mac).
 */
export function useKeyboardShortcuts(map: ShortcutMap) {
  function normalize(e: KeyboardEvent): string {
    const parts: string[] = []
    if (e.ctrlKey || e.metaKey) parts.push('mod')
    if (e.shiftKey) parts.push('shift')
    if (e.altKey) parts.push('alt')
    const key = e.key.toLowerCase()
    parts.push(key === 'escape' ? 'esc' : key)
    return parts.join('+')
  }

  function handler(e: KeyboardEvent): void {
    const combo = normalize(e)
    const fn = map[combo]
    if (fn) {
      e.preventDefault()
      fn(e)
    }
  }

  onMounted(() => window.addEventListener('keydown', handler))
  onBeforeUnmount(() => window.removeEventListener('keydown', handler))
}
