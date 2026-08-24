/**
 * Globale Navigation zur Laufzeit laden.
 *
 * Der Editor wird unter https://kodinitools.com/texteditor/ ausgeliefert; die
 * gemeinsame Navigation der Website liegt serverseitig unter
 * /var/www/kodinitools.com/partials/nav.html -- per HTTP erreichbar unter
 * /partials/nav.html (wurzel-relativ, gleiche Origin wie /public/... ).
 *
 * index.html backt eine Kopie des Partials in den Slot #global-nav-slot ein: sie
 * ist sofort sichtbar (schneller First Paint) und funktioniert offline. Diese
 * Funktion holt anschliessend die AKTUELLE nav.html vom Server und ersetzt damit
 * den Slot -- so stimmt die Navigation immer mit der uebrigen Website ueberein,
 * ohne dass der Editor dafuer neu gebaut werden muss. Schlaegt der Abruf fehl
 * (offline, nicht erreichbar, falsche Antwort), bleibt die eingebackene Kopie
 * unveraendert stehen.
 */

/** Wurzel-relative URL des Server-Partials (NICHT unter /texteditor/). */
const NAV_URL = '/partials/nav.html'

/** Kennung, an der wir eine gueltige Navigations-Antwort erkennen. Verhindert,
 *  dass eine SPA-Fallback- oder Fehlerseite die Navigation ueberschreibt. */
const NAV_MARKER = 'global-nav'

/**
 * Holt /partials/nav.html und ersetzt bei Erfolg den Inhalt des Nav-Slots.
 * Fehler werden bewusst verschluckt -- der eingebackene Fallback bleibt dann
 * stehen. Laeuft nur im Browser (kein Effekt in SSR/Tests ohne DOM/fetch).
 */
export async function loadGlobalNav(): Promise<void> {
  if (typeof document === 'undefined' || typeof fetch === 'undefined') return
  const slot = document.getElementById('global-nav-slot')
  if (!slot) return
  try {
    // no-store: immer die aktuelle Fassung vom Server, nichts aus dem Cache.
    const res = await fetch(NAV_URL, { cache: 'no-store', credentials: 'omit' })
    if (!res.ok) return
    const html = await res.text()
    // Nur uebernehmen, wenn es wirklich die Navigation ist (kein index.html-
    // Fallback, keine Fehlerseite).
    if (!html.includes(NAV_MARKER)) return
    replaceSlot(slot, html)
  } catch {
    /* offline / nicht erreichbar -> Fallback bleibt */
  }
}

/**
 * Ersetzt den Slot-Inhalt durch das geladene Markup. `<script>`-Elemente werden
 * neu erzeugt, damit sie ausgefuehrt werden (ueber innerHTML eingefuegte Skripte
 * laufen nicht). Das Nav-Skript bindet seine Listener an konkrete Knoten aus dem
 * neuen Markup -- eine erneute Ausfuehrung ist daher unkritisch.
 */
function replaceSlot(slot: HTMLElement, html: string): void {
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  // Skripte herausloesen, restliches Markup einsetzen, dann Skripte lauffaehig
  // nachziehen.
  const scripts = Array.from(tpl.content.querySelectorAll('script'))
  scripts.forEach((s) => s.remove())
  slot.replaceChildren(tpl.content)
  for (const old of scripts) {
    const s = document.createElement('script')
    for (const attr of Array.from(old.attributes)) s.setAttribute(attr.name, attr.value)
    s.textContent = old.textContent
    slot.appendChild(s)
  }
}
