import { nextTick, onBeforeUnmount, ref } from 'vue'

/**
 * Dropdown-Menue, das an einem Anker-Button haengt und per `<Teleport to="body">`
 * ausserhalb der Werkzeugleiste liegt.
 *
 * Hintergrund: Auf schmalen (Touch-)Bildschirmen scrollen die Werkzeug- und
 * Format-Leiste horizontal (`overflow-x: auto`). Ein `position: absolute`-Menue
 * innerhalb einer scrollenden Leiste wuerde abgeschnitten. Deshalb wird das Menue
 * ins `<body>` teleportiert und `position: fixed` an der Anker-Position
 * ausgerichtet -- so bleibt es immer vollstaendig sichtbar.
 *
 * Geschlossen wird bei Klick/Tap ausserhalb, beim Scrollen (auch der Leiste),
 * bei Groessenaenderung und mit `Esc`.
 */
export function useAnchoredMenu(width = 176) {
  const open = ref(false)
  const anchorEl = ref<HTMLElement | null>(null)
  const menuEl = ref<HTMLElement | null>(null)
  const style = ref<Record<string, string>>({})
  const MARGIN = 8

  function measure(): void {
    const el = anchorEl.value
    if (!el) return
    const b = el.getBoundingClientRect()
    // Waagerecht am linken Rand des Ankers, aber nie ueber den Bildschirmrand
    // hinaus (wichtig auf kleinen Geraeten).
    const left = Math.max(MARGIN, Math.min(b.left, window.innerWidth - width - MARGIN))
    const top = b.bottom + 4
    // Nach unten nur so hoch, wie Platz ist -- der Inhalt scrollt dann intern.
    const maxHeight = Math.max(160, window.innerHeight - top - MARGIN)
    style.value = {
      left: `${left}px`,
      top: `${top}px`,
      maxHeight: `${maxHeight}px`,
    }
  }

  function onWindowChange(): void {
    if (open.value) close()
  }
  function onPointerDown(e: Event): void {
    const target = e.target as Node
    if (anchorEl.value?.contains(target) || menuEl.value?.contains(target)) return
    close()
  }
  function onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') close()
  }

  function bind(): void {
    // `capture: true`, damit auch das Scrollen der Leiste selbst erfasst wird.
    window.addEventListener('scroll', onWindowChange, true)
    window.addEventListener('resize', onWindowChange)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
  }
  function unbind(): void {
    window.removeEventListener('scroll', onWindowChange, true)
    window.removeEventListener('resize', onWindowChange)
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKey)
  }

  function openMenu(): void {
    if (open.value) return
    open.value = true
    nextTick(measure)
    bind()
  }
  function close(): void {
    if (!open.value) return
    open.value = false
    unbind()
  }
  function toggle(): void {
    if (open.value) close()
    else openMenu()
  }

  onBeforeUnmount(unbind)

  return { open, anchorEl, menuEl, style, toggle, close, openMenu }
}
