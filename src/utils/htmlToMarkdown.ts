/**
 * Wandelt den bereinigten Rich-Text-Inhalt des Editors (HTML) in echtes
 * Markdown um -- fuer den `.md`-Export und die Markdown-Vorschau. Damit wird die
 * WYSIWYG-Formatierung (ueber die Werkzeugleiste) formatierungstreu zu Markdown,
 * nicht nur zu reinem Text.
 *
 * Abgedeckt sind die im Editor moeglichen Bloecke/Auszeichnungen:
 *  - Ueberschriften h1-h3        -> `#`, `##`, `###`
 *  - Listen ul/ol (verschachtelt) -> `- ` bzw. `1. ` (mit Einzug)
 *  - Fett/Kursiv als <b>/<strong>/<i>/<em> ODER als <span style="font-weight/
 *    font-style"> (so, wie execCommand sie erzeugt) -> `**`/`*`/`***`
 *  - Zeilen <div>/<p>, Umbrueche <br>
 *
 * Reiner Text wird bewusst NICHT maskiert: wer Markdown-Syntax tippt, findet sie
 * im Ergebnis unveraendert wieder (der Editor ist zugleich Markdown-Quelle).
 * Frei platzierte Bilder liegen ausserhalb des Textflusses und sind nicht Teil
 * der Markdown-Ausgabe.
 */

function styleOf(el: HTMLElement): CSSStyleDeclaration | undefined {
  return el.style
}

function isBold(el: HTMLElement): boolean {
  if (el.tagName === 'B' || el.tagName === 'STRONG') return true
  const w = styleOf(el)?.fontWeight ?? ''
  return w === 'bold' || w === 'bolder' || (/^\d+$/.test(w) && Number(w) >= 600)
}

function isItalic(el: HTMLElement): boolean {
  return el.tagName === 'I' || el.tagName === 'EM' || styleOf(el)?.fontStyle === 'italic'
}

/** Serialisiert Inline-Inhalt (Text + Fett/Kursiv). Listen werden hier ignoriert. */
function inline(node: Node): string {
  let out = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += child.nodeValue ?? ''
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const el = child as HTMLElement
    if (el.tagName === 'BR') {
      out += '\n'
      return
    }
    // Verschachtelte Listen gehoeren auf die Blockebene, nicht hierher.
    if (el.tagName === 'UL' || el.tagName === 'OL') return
    let inner = inline(el)
    if (inner.trim()) {
      const bold = isBold(el)
      const italic = isItalic(el)
      if (bold && italic) inner = `***${inner}***`
      else if (bold) inner = `**${inner}**`
      else if (italic) inner = `*${inner}*`
    }
    out += inner
  })
  return out
}

/** Zeilen einer Liste (rekursiv fuer Verschachtelung). */
function listLines(listEl: HTMLElement, ordered: boolean, depth: number): string[] {
  const lines: string[] = []
  let index = 1
  listEl.childNodes.forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const el = child as HTMLElement
    if (el.tagName !== 'LI') return
    const indent = '  '.repeat(depth)
    const marker = ordered ? `${index++}. ` : '- '
    const text = inline(el)
      .replace(/\s*\n\s*/g, ' ')
      .trim()
    lines.push(indent + marker + text)
    // Verschachtelte Listen direkt unter diesem li.
    el.childNodes.forEach((sub) => {
      if (sub.nodeType !== Node.ELEMENT_NODE) return
      const subEl = sub as HTMLElement
      if (subEl.tagName === 'UL') lines.push(...listLines(subEl, false, depth + 1))
      else if (subEl.tagName === 'OL') lines.push(...listLines(subEl, true, depth + 1))
    })
  })
  return lines
}

/** Enthaelt das Element ein Block-Element? (dann ist es ein Wrapper, keine Zeile) */
function hasBlockChild(el: HTMLElement): boolean {
  return el.querySelector('h1,h2,h3,ul,ol,div,p') !== null
}

/** Sammelt Bloecke (rekursiv) -- der Editor verpackt Listen z. B. in <div>. */
function walk(node: Node, blocks: string[]): void {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.nodeValue ?? ''
      if (text.trim()) blocks.push(text)
      return
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return
    const el = child as HTMLElement
    const tag = el.tagName
    if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
      const level = Number(tag[1])
      // Leerzeile davor/danach -- Ueberschriften stehen in Markdown allein.
      blocks.push(
        '',
        `${'#'.repeat(level)} ${inline(el)
          .replace(/\s*\n\s*/g, ' ')
          .trim()}`,
        '',
      )
    } else if (tag === 'UL' || tag === 'OL') {
      blocks.push('', ...listLines(el, tag === 'OL', 0), '')
    } else if (tag === 'BR') {
      blocks.push('')
    } else if ((tag === 'DIV' || tag === 'P') && hasBlockChild(el)) {
      // Reiner Wrapper um eine Liste/Ueberschrift -> hindurchgehen.
      walk(el, blocks)
    } else {
      // div/p und alles Uebrige als eine Zeile.
      const line = inline(el).replace(/\n+$/, '')
      blocks.push(line.trim() === '' ? '' : line)
    }
  })
}

export function htmlToMarkdown(html: string): string {
  if (typeof document === 'undefined') return ''
  const tpl = document.createElement('template')
  tpl.innerHTML = html

  const blocks: string[] = []
  walk(tpl.content, blocks)

  return blocks
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
}
