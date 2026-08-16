import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '@/utils/markdown'

describe('renderMarkdown', () => {
  it('rendert Ueberschriften, Fett und Kursiv', () => {
    expect(renderMarkdown('# Titel')).toContain('<h1>Titel</h1>')
    expect(renderMarkdown('**fett**')).toMatch(/<(strong|b)>fett<\/(strong|b)>/)
    expect(renderMarkdown('*kursiv*')).toMatch(/<(em|i)>kursiv<\/(em|i)>/)
  })

  it('rendert Aufzaehlungs- und nummerierte Listen', () => {
    const ul = renderMarkdown('- eins\n- zwei')
    expect(ul).toContain('<ul>')
    expect(ul).toContain('<li>eins</li>')
    const ol = renderMarkdown('1. eins\n2. zwei')
    expect(ol).toContain('<ol>')
    expect(ol).toContain('<li>eins</li>')
  })

  it('rendert Links und Code', () => {
    expect(renderMarkdown('[Kodini](https://kodinitools.com)')).toContain(
      'href="https://kodinitools.com"',
    )
    expect(renderMarkdown('`code`')).toContain('<code>code</code>')
    expect(renderMarkdown('> Zitat')).toContain('<blockquote>')
  })

  it('entfernt Scripts und gefaehrliche Links (XSS-Schutz)', () => {
    const out = renderMarkdown('<script>alert(1)</script>Text')
    expect(out).not.toMatch(/<script/i)
    expect(out).toContain('Text')
    // javascript:-URL darf nicht als Link-Ziel ueberleben.
    const link = renderMarkdown('[x](javascript:alert(1))')
    expect(link).not.toMatch(/javascript:/i)
  })

  it('liefert fuer leere Eingabe leeres/harmloses HTML', () => {
    expect(renderMarkdown('').trim()).toBe('')
  })
})
