import { describe, expect, it } from 'vitest'
import {
  contentToHtml,
  contentToPlain,
  htmlToPlain,
  isHtmlContent,
  plainToHtml,
  sanitizeHtml,
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
