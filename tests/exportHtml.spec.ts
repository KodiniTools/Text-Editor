import { describe, expect, it } from 'vitest'
import { buildHtmlDocument, type HtmlDocOptions } from '@/utils/exportHtml'

function opts(over: Partial<HtmlDocOptions> = {}): HtmlDocOptions {
  return {
    title: 'Mein Dokument',
    lang: 'de',
    html: '<div>Hallo <b>Welt</b></div>',
    widthMm: 210,
    heightMm: 297,
    typography: {
      fontStack: 'Arial, sans-serif',
      fontWeight: '400',
      fontStyle: 'normal',
      fontSizePx: 16,
      lineHeight: 1.7,
      letterSpacingPx: 0,
      textAlign: 'left',
      color: '#111827',
      wrap: true,
    },
    ...over,
  }
}

describe('buildHtmlDocument', () => {
  it('erzeugt ein vollstaendiges HTML-Dokument mit Titel, Sprache und Inhalt', () => {
    const html = buildHtmlDocument(opts())
    expect(html).toMatch(/^<!doctype html>/)
    expect(html).toContain('<html lang="de">')
    expect(html).toContain('<title>Mein Dokument</title>')
    expect(html).toContain('<div>Hallo <b>Welt</b></div>')
    expect(html).toContain('font-family:Arial, sans-serif')
    expect(html).toContain('white-space:pre-wrap')
  })

  it('maskiert den Titel (kein HTML-Ausbruch)', () => {
    const html = buildHtmlDocument(opts({ title: 'A <script> & "B"' }))
    expect(html).toContain('<title>A &lt;script&gt; &amp; &quot;B&quot;</title>')
    expect(html).not.toContain('<title>A <script>')
  })

  it('bettet frei platzierte Bilder mit Position und Groesse ein', () => {
    const src = 'data:image/png;base64,AAAA'
    const html = buildHtmlDocument(opts({ images: [{ src, x: 10, y: 20, w: 100, h: 50 }] }))
    expect(html).toContain(`src="${src}"`)
    expect(html).toContain('left:10px;top:20px;width:100px;height:50px')
    // Bereich hoch genug fuer das Bild.
    expect(html).toContain('min-height:70px')
  })

  it('verpackt ein verlinktes Bild in einen Anker (klickbar, sicher)', () => {
    const src = 'data:image/png;base64,AAAA'
    const html = buildHtmlDocument(
      opts({ images: [{ src, x: 10, y: 20, w: 100, h: 50, href: 'https://kodini.de' }] }),
    )
    expect(html).toContain('<a href="https://kodini.de"')
    expect(html).toContain('rel="noopener noreferrer nofollow"')
    expect(html).toContain('target="_blank"')
    // Der Anker traegt die Position, das Bild fuellt ihn.
    expect(html).toMatch(/<a href="https:\/\/kodini\.de"[^>]*left:10px;top:20px/)
    expect(html).toContain(`<img alt="" src="${src}"`)
  })

  it('maskiert das Link-Ziel eines Bildes (kein Attribut-Ausbruch)', () => {
    const src = 'data:image/png;base64,AAAA'
    const html = buildHtmlDocument(
      opts({ images: [{ src, x: 0, y: 0, w: 10, h: 10, href: 'https://x.de/"onload="alert(1)' }] }),
    )
    expect(html).not.toContain('onload="alert(1)"')
    expect(html).toContain('&quot;onload=')
  })

  it('nutzt pre statt pre-wrap, wenn Umbruch aus ist', () => {
    const html = buildHtmlDocument(opts({ typography: { ...opts().typography, wrap: false } }))
    expect(html).toContain('white-space:pre;')
  })

  it('faellt bei leerem Inhalt auf einen Zeilenumbruch zurueck', () => {
    const html = buildHtmlDocument(opts({ html: '' }))
    expect(html).toContain('<article class="kodini-doc"><br></article>')
  })
})
