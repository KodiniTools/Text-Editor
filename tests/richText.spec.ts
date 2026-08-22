import { describe, expect, it } from 'vitest'
import {
  contentToHtml,
  contentToPlain,
  htmlFileToSource,
  htmlToPlain,
  isHtmlContent,
  normalizeUrl,
  plainToHtml,
  sanitizeHtml,
  sanitizeUrl,
} from '@/utils/richText'

describe('isHtmlContent', () => {
  it('erkennt HTML an den erlaubten Tags', () => {
    expect(isHtmlContent('<div>Hallo</div>')).toBe(true)
    expect(isHtmlContent('Text <b>fett</b>')).toBe(true)
    expect(isHtmlContent('Nur Text')).toBe(false)
    expect(isHtmlContent('1 < 2 und 3 > 2')).toBe(false)
  })
})

describe('plainToHtml / htmlToPlain', () => {
  it('macht aus Zeilen <div>-Bloecke und zurueck', () => {
    const html = plainToHtml('Zeile 1\nZeile 2')
    expect(html).toBe('<div>Zeile 1</div><div>Zeile 2</div>')
    expect(htmlToPlain(html)).toBe('Zeile 1\nZeile 2')
  })

  it('behaelt leere Zeilen', () => {
    const html = plainToHtml('a\n\nb')
    expect(html).toContain('<div><br></div>')
    expect(htmlToPlain(html)).toBe('a\n\nb')
  })

  it('escapt Sonderzeichen', () => {
    expect(plainToHtml('a < b & c')).toBe('<div>a &lt; b &amp; c</div>')
    expect(htmlToPlain('<div>a &lt; b &amp; c</div>')).toBe('a < b & c')
  })

  it('<br> und Bloecke werden zu Zeilenumbruechen', () => {
    expect(htmlToPlain('<div>a<br>b</div><div>c</div>')).toBe('a\nb\nc')
  })
})

describe('sanitizeHtml', () => {
  it('behaelt Fett/Kursiv/Farbe', () => {
    const out = sanitizeHtml('<b>fett</b> <i>kursiv</i> <span style="color: #ff0000">rot</span>')
    expect(out).toContain('fett')
    expect(out.toLowerCase()).toContain('color')
  })

  it('entfernt Scripts und gefaehrliche Attribute', () => {
    const out = sanitizeHtml('<img src=x onerror="alert(1)"><script>alert(1)</script>Text')
    expect(out).not.toMatch(/script/i)
    expect(out).not.toMatch(/onerror/i)
    expect(out).toContain('Text')
  })

  it('entfernt layoutbrechende Styles (font-size u. a.)', () => {
    const out = sanitizeHtml('<span style="font-size: 40px; color: #00ff00">x</span>')
    expect(out).not.toMatch(/font-size/i)
    expect(out.toLowerCase()).toContain('color')
  })
})

describe('htmlFileToSource', () => {
  it('oeffnet HTML als Quelltext -- das Markup bleibt als Text sichtbar', () => {
    const src = '<a href="https://example.com">MP3 Konverter</a>'
    const out = htmlFileToSource(src)
    // Die spitzen Klammern sind maskiert -> werden NICHT als Link gerendert,
    // sondern als sichtbarer Code angezeigt.
    expect(out).toContain('&lt;a href=')
    expect(out).not.toMatch(/<a\s/i)
    // Zurueckgewandelt kommt exakt der Quelltext wieder heraus.
    expect(contentToPlain(out)).toBe(src)
  })

  it('behaelt mehrere Zeilen samt Einrueckung', () => {
    const src = '<ul>\n  <li>Eins</li>\n  <li>Zwei</li>\n</ul>'
    const out = htmlFileToSource(src)
    expect(contentToPlain(out)).toBe(src)
    // Jede Zeile wird ein eigener Block.
    expect(out.match(/<div>/g)?.length).toBe(4)
  })

  it('entfernt umschliessende Leerzeilen und BOM, nicht die inneren', () => {
    const out = htmlFileToSource('\n\n<p>Hallo</p>\n\n')
    expect(contentToPlain(out)).toBe('<p>Hallo</p>')
  })
})

describe('Ueberschriften & Listen', () => {
  it('erkennt Ueberschriften/Listen als HTML-Inhalt', () => {
    expect(isHtmlContent('<h1>Titel</h1>')).toBe(true)
    expect(isHtmlContent('<ul><li>a</li></ul>')).toBe(true)
    expect(isHtmlContent('<ol><li>1</li></ol>')).toBe(true)
  })

  it('behaelt Ueberschriften und Listen beim Bereinigen', () => {
    const out = sanitizeHtml('<h1>Titel</h1><ul><li>Eins</li><li>Zwei</li></ul>')
    expect(out).toContain('<h1>Titel</h1>')
    expect(out).toContain('<ul>')
    expect(out).toContain('<li>Eins</li>')
  })

  it('projiziert Ueberschriften/Listen als Zeilen in reinen Text', () => {
    const html = '<h1>Titel</h1><ul><li>Eins</li><li>Zwei</li></ul><div>Ende</div>'
    expect(htmlToPlain(html)).toBe('Titel\nEins\nZwei\nEnde')
    expect(contentToPlain(html)).toBe('Titel\nEins\nZwei\nEnde')
  })

  it('erlaubt Fett/Farbe innerhalb einer Ueberschrift', () => {
    const out = sanitizeHtml('<h2><b>Fett</b> <span style="color: #ff0000">rot</span></h2>')
    expect(out).toContain('<h2>')
    expect(out).toContain('<b>Fett</b>')
    expect(out.toLowerCase()).toContain('color')
  })
})

describe('Erweiterte Auszeichnung', () => {
  it('erkennt neue Tags als HTML-Inhalt', () => {
    expect(isHtmlContent('<u>x</u>')).toBe(true)
    expect(isHtmlContent('<s>x</s>')).toBe(true)
    expect(isHtmlContent('<mark>x</mark>')).toBe(true)
    expect(isHtmlContent('<a href="/x">x</a>')).toBe(true)
    expect(isHtmlContent('<blockquote>x</blockquote>')).toBe(true)
  })

  it('behaelt Unterstrichen/Durchgestrichen/Highlight/Zitat beim Bereinigen', () => {
    const out = sanitizeHtml('<u>u</u><s>s</s><mark>m</mark><blockquote>zitat</blockquote>')
    expect(out).toContain('<u>u</u>')
    expect(out).toContain('<s>s</s>')
    expect(out).toContain('<mark>m</mark>')
    expect(out).toContain('<blockquote>zitat</blockquote>')
  })

  it('behaelt sichere Link-Ziele, verwirft aber javascript:', () => {
    const ok = sanitizeHtml('<a href="https://example.com">Link</a>')
    expect(ok).toContain('href="https://example.com"')
    expect(ok).toContain('Link')

    const evil = sanitizeHtml('<a href="javascript:alert(1)">böse</a>')
    expect(evil).not.toMatch(/javascript:/i)
    expect(evil).toContain('böse')
  })

  it('projiziert Zitat und Link-Text in reinen Text', () => {
    expect(htmlToPlain('<blockquote>Zitat</blockquote><div>Ende</div>')).toBe('Zitat\nEnde')
    expect(htmlToPlain('<div>Siehe <a href="https://x.de">hier</a>.</div>')).toBe('Siehe hier.')
    expect(htmlToPlain('<div>Text <mark>hervor</mark></div>')).toBe('Text hervor')
  })
})

describe('sanitizeUrl', () => {
  it('erlaubt sichere Schemata und Pfade', () => {
    expect(sanitizeUrl('https://kodini.de')).toBe('https://kodini.de')
    expect(sanitizeUrl('http://x.de')).toBe('http://x.de')
    expect(sanitizeUrl('mailto:a@b.de')).toBe('mailto:a@b.de')
    expect(sanitizeUrl('tel:+49123')).toBe('tel:+49123')
    expect(sanitizeUrl('/pfad/seite')).toBe('/pfad/seite')
    expect(sanitizeUrl('#anker')).toBe('#anker')
    expect(sanitizeUrl('./rel')).toBe('./rel')
  })

  it('hebt schema-relative URLs auf https', () => {
    expect(sanitizeUrl('//cdn.example.com/x')).toBe('https://cdn.example.com/x')
  })

  it('verwirft gefaehrliche/unbekannte Schemata', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeUrl(' JavaScript:alert(1)')).toBe('')
    expect(sanitizeUrl('data:text/html,<script>')).toBe('')
    expect(sanitizeUrl('ftp://x.de')).toBe('')
    expect(sanitizeUrl('')).toBe('')
    expect(sanitizeUrl('   ')).toBe('')
  })
})

describe('normalizeUrl', () => {
  it('laesst URLs mit Schema/Anker/Pfad unveraendert', () => {
    expect(normalizeUrl('https://kodini.de')).toBe('https://kodini.de')
    expect(normalizeUrl('mailto:a@b.de')).toBe('mailto:a@b.de')
    expect(normalizeUrl('#anker')).toBe('#anker')
    expect(normalizeUrl('/pfad')).toBe('/pfad')
    expect(normalizeUrl('./rel')).toBe('./rel')
  })

  it('ergaenzt fehlendes Schema', () => {
    expect(normalizeUrl('kodini.de')).toBe('https://kodini.de')
    expect(normalizeUrl('  example.com/x  ')).toBe('https://example.com/x')
    expect(normalizeUrl('mail@x.de')).toBe('mailto:mail@x.de')
  })

  it('leere Eingabe -> leerer String', () => {
    expect(normalizeUrl('')).toBe('')
    expect(normalizeUrl('   ')).toBe('')
  })
})

describe('contentToHtml / contentToPlain', () => {
  it('reiner Text wird zu HTML und wieder zu Text', () => {
    expect(contentToHtml('Hallo\nWelt')).toBe('<div>Hallo</div><div>Welt</div>')
    expect(contentToPlain('Hallo\nWelt')).toBe('Hallo\nWelt')
  })

  it('HTML bleibt HTML, Text-Projektion ohne Tags', () => {
    const html = '<div><b>Fett</b> normal</div>'
    expect(contentToHtml(html)).toContain('<b>Fett</b>')
    expect(contentToPlain(html)).toBe('Fett normal')
  })
})
