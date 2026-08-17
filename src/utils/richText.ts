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

/** Liefert immer bereinigtes HTML -- egal ob der Inhalt HTML oder reiner Text ist. */
export function contentToHtml(raw: string): string {
  return isHtmlContent(raw) ? sanitizeHtml(raw) : plainToHtml(raw)
}

/** Liefert immer reinen Text -- fuer Statistik, .txt/.md, Kopieren, Suchen. */
export function contentToPlain(raw: string): string {
  return isHtmlContent(raw) ? htmlToPlain(sanitizeHtml(raw)) : raw
}
