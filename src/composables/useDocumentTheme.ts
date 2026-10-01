import { onBeforeUnmount, readonly, ref, type Ref } from 'vue'

/**
 * Liest das aktive Theme aus `<html data-theme>` -- der einzigen Quelle, die
 * useTheme (Editor) UND der Umschalter der globalen Navigation setzen. So folgen
 * Komponenten jedem Wechsel, egal woher er kommt.
 */
export function useDocumentTheme(): { isDark: Readonly<Ref<boolean>> } {
  const root = document.documentElement
  const read = (): boolean => root.getAttribute('data-theme') !== 'light'
  const isDark = ref(read())

  const observer = new MutationObserver(() => {
    isDark.value = read()
  })
  observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  onBeforeUnmount(() => observer.disconnect())

  return { isDark: readonly(isDark) }
}
