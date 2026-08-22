/**
 * Hilfsfunktionen fuer den Rich-Text-Inhalt des Editors.
 *
 * Der Editor speichert seit der Inline-Formatierung (Fett/Kursiv/Farbe) HTML
 * statt reinem Text. Damit die uebrigen Funktionen (Statistik, .txt-/.md-Export,
 * Kopieren, Suchen) weiter mit reinem Text arbeiten, gibt es hier die
 * Umwandlungen in beide Richtungen -- plus eine strikte Bereinigung, die nur
 * die wirklich benoetigten Auszeichnungen zulaesst.
 *
 * Bewusst KEINE Schriftgroesse/-art im erlaubten Style: die Seiten-Ansicht und
 * der Seitenumbruch setzen eine einheitliche Zeilenhoehe voraus. Fett, Kursiv
 * und Farbe aendern die Zeilenhoehe nicht -- Groesse/Art pro Auswahl kaemen erst
 * mit einer Umstellung des Seitenumbruchs.
 */

import DOMPurify from 'dompurify'

/**
 * Erlaubte Tags: Absaetze/Zeilen, die Inline-Auszeichnungen (Fett/Kursiv sowie
 * die erweiterte Auszeichnung Unterstrichen/Durchgestrichen/Highlight/Link),
 * Ueberschriften (h1-h3), Zitate (blockquote) und Listen (ul/ol/li). Die
 * Block-Elemente bekommen ihr rasterkonformes Aussehen ueber globales CSS
 * (siehe style.css), nicht ueber Inline-Styles -- deshalb bleiben die erlaubten
 * Style-Eigenschaften unveraendert (nur Farbe/Gewicht/Stil, die die Zeilenhoehe
 * nicht sprengen). Unterstrichen/Durchgestrichen/Highlight kommen bewusst als
 * eigene Tags (u/s/mark) und NICHT als text-decoration/background-Style -- so
 * bleibt die Style-Allowlist minimal und ein Highlight kann kein background:url()
 * einschleusen.
 */
const ALLOWED_TAGS = [
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'strike',
  'del',
  'mark',
  'a',
  'span',
  'br',
  'div',
  'p',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'ul',
  'ol',
  'li',
]
/** style (gefiltert) und href (fuer Links, gegen javascript: durch DOMPurify geschuetzt). */
const ALLOWED_ATTR = ['style', 'href']
/** Style-Eigenschaften, die die Zeilenhoehe NICHT veraendern. */
const ALLOWED_STYLE = new Set(['color', 'font-weight', 'font-style'])

/** Block-Elemente, die im reinen Text zu Zeilenumbruechen werden. */
const BLOCK_TAGS = new Set(['DIV', 'P', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'LI'])

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Entfernt aus jedem style-Attribut alles ausser Farbe/Gewicht/Stil. So kann
 * eingefuegter Fremd-HTML weder die Seitenhoehe (font-size) noch etwas
 * Gefaehrliches (background:url(...)) einschleusen.
 */
function filterInlineStyles(html: string): string {
  if (typeof document === 'undefined') return html
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  tpl.content.querySelectorAll<HTMLElement>('[style]').forEach((el) => {
    const keep: string[] = []
    for (let i = 0; i < el.style.length; i++) {
      const prop = el.style.item(i)
      if (ALLOWED_STYLE.has(prop)) {
        const value = el.style.getPropertyValue(prop)
        if (value) keep.push(`${prop}: ${value}`)
      }
    }
    if (keep.length) el.setAttribute('style', keep.join('; '))
    else el.removeAttribute('style')
  })
  return tpl.innerHTML
}

/** Bereinigt HTML auf die erlaubten Tags/Styles (XSS- und Layout-Schutz). */
export function sanitizeHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
  return filterInlineStyles(clean)
}

/** Erkennt, ob ein gespeicherter Inhalt bereits HTML ist (neue Dokumente) oder
 *  noch reiner Text (aeltere Staende). */
export function isHtmlContent(raw: string): boolean {
  return /<(?:\/?)(?:b|strong|i|em|u|s|strike|del|mark|a|span|br|div|p|h1|h2|h3|blockquote|ul|ol|li)\b/i.test(
    raw,
  )
}

/**
 * Erlaubte URL-Schemata fuer selbst gebaute Links (z. B. verlinkte Bilder, deren
 * Anker nicht durch DOMPurify laeuft). Zugelassen: http(s), mailto, tel, absolute
 * Pfade (`/`), Anker (`#`) und relative Pfade (`./`, `../`). Alles andere --
 * insbesondere `javascript:` -- ergibt einen leeren String (kein Link).
 */
const SAFE_URL = /^(?:https?:|mailto:|tel:|#|\/|\.{1,2}\/)/i

/** Liefert die URL zurueck, wenn ihr Schema sicher ist -- sonst ''. */
export function sanitizeUrl(url: string): string {
  const trimmed = (url ?? '').trim()
  if (!trimmed) return ''
  // Schema-relativ (//host/...) -> auf https anheben.
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`
  return SAFE_URL.test(trimmed) ? trimmed : ''
}

/**
 * Ergaenzt eine fehlende URL-Kennung, damit Nutzereingaben wie `example.com`
 * oder `mail@x.de` zu benutzbaren Links werden. Leere Eingabe -> ''. Prueft NICHT
 * auf Sicherheit -- dafuer anschliessend `sanitizeUrl` verwenden.
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  // Bereits mit Schema, ankerlokal (#), absolut (/) oder mailto/tel -> unveraendert.
  if (/^([a-z][a-z0-9+.-]*:|#|\/|\.{1,2}\/)/i.test(trimmed)) return trimmed
  // E-Mail-artig ohne Schema -> mailto:.
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return `mailto:${trimmed}`
  return `https://${trimmed}`
}

/** Reiner Text -> HTML: je Zeile ein <div>, leere Zeilen als <div><br></div>. */
export function plainToHtml(text: string): string {
  if (text === '') return ''
  return text
    .split(/\r?\n/)
    .map((line) => (line === '' ? '<div><br></div>' : `<div>${escapeHtml(line)}</div>`))
    .join('')
}

/** HTML -> reiner Text: Block-Elemente und <br> werden zu Zeilenumbruechen. */
export function htmlToPlain(html: string): string {
  if (typeof document === 'undefined') {
    // Fallback ohne DOM (Tests): Tags grob entfernen.
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(div|p|h1|h2|h3|blockquote|li)>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/\n$/, '')
  }
  const tpl = document.createElement('template')
  tpl.innerHTML = html
  const ctx = { text: '' }
  walkPlain(tpl.content, ctx)
  return ctx.text.replace(/\n$/, '')
}

function walkPlain(node: Node, ctx: { text: string }): void {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      ctx.text += child.nodeValue ?? ''
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const el = child as HTMLElement
    if (el.tagName === 'BR') {
      ctx.text += '\n'
      return
    }
    const block = BLOCK_TAGS.has(el.tagName)
    if (block && ctx.text !== '' && !ctx.text.endsWith('\n')) ctx.text += '\n'
    walkPlain(el, ctx)
    if (block && !ctx.text.endsWith('\n')) ctx.text += '\n'
  })
}

/**
 * Wandelt eine ganze HTML-DATEI in bearbeitbaren Editor-Inhalt um. Anders als
 * `contentToHtml` (das einen bereits vorhandenen Editor-Wert bereinigt) bekommt
 * diese Funktion ein komplettes Dokument (`<!doctype><html><head>...<body>...`).
 * Sie schneidet den Rumpf heraus -- bei einem eigenen Export den reinen
 * Textkoerper (`.kodini-doc`), sonst den `<body>` -- und bereinigt ihn auf die
 * erlaubten Auszeichnungen. So landen Kopfdaten wie `<title>`, `<meta>` oder das
 * CSS aus `<style>` NICHT als sichtbarer Text im Editor.
 *
 * Hinweis: Der Editor kennt Bilder nur als frei platzierte Overlays (Seiten-
 * Modus), nicht als Inline-`<img>` im Fliesstext -- eingebettete Bilder gehen
 * beim Oeffnen daher verloren (bleiben aber in der Originaldatei erhalten).
 */
export function htmlDocumentToContent(raw: string): string {
  if (typeof DOMParser === 'undefined') {
    // Fallback ohne DOM: grob den <body> ausschneiden, sonst das Ganze.
    const body = raw.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
    return sanitizeHtml(body ? body[1]! : raw)
  }
  const doc = new DOMParser().parseFromString(raw, 'text/html')
  // Von diesem Editor exportiert -> nur der Textkoerper (ohne Bild-Overlays).
  const article = doc.querySelector('.kodini-doc')
  const root = article ?? doc.body ?? doc.documentElement
  return sanitizeHtml(root ? root.innerHTML : raw)
}

/** Liefert immer bereinigtes HTML -- egal ob der Inhalt HTML oder reiner Text ist. */
export function contentToHtml(raw: string): string {
  return isHtmlContent(raw) ? sanitizeHtml(raw) : plainToHtml(raw)
}

/** Liefert immer reinen Text -- fuer Statistik, .txt/.md, Kopieren, Suchen. */
export function contentToPlain(raw: string): string {
  return isHtmlContent(raw) ? htmlToPlain(sanitizeHtml(raw)) : raw
}
