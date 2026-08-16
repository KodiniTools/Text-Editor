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

  function onScroll(e: Event): void {
    if (!open.value) return
    const target = e.target
    // Scrollen INNERHALB des Menues (lange Werkzeug-Liste) darf es nicht
    // schliessen -- sonst verschwindet es beim Blaettern.
    if (menuEl.value && target instanceof Node && menuEl.value.contains(target)) return
    const el = anchorEl.value
    if (!el) return
    const b = el.getBoundingClientRect()
    // Ist der Anker aus dem Sichtbereich gescrollt, schliessen; sonst dem Anker
    // folgen (die Leiste/Seite scrollt) statt es einfach zu schliessen.
    if (b.bottom < 0 || b.top > window.innerHeight || b.right < 0 || b.left > window.innerWidth) {
      close()
    } else {
      measure()
    }
  }
  function onResize(): void {
    if (open.value) measure()
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
    // `capture: true`, damit auch das Scrollen der (Mobile) Leiste erfasst wird.
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
  }
  function unbind(): void {
    window.removeEventListener('scroll', onScroll, true)
    window.removeEventListener('resize', onResize)
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
