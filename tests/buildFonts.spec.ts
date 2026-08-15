import { describe, expect, it } from 'vitest'
import { buildFontsFromFiles } from '@/config/fonts'

describe('buildFontsFromFiles', () => {
  it('macht aus jedem Schnitt einen eigenen Eintrag', () => {
    const fonts = buildFontsFromFiles([
      'Supreme-Regular.woff2',
      'Supreme-Bold.woff2',
      'Supreme-Light.woff2',
    ])
    expect(fonts.map((f) => f.label)).toEqual(['Supreme Light', 'Supreme Regular', 'Supreme Bold'])
    // Alle unter derselben Familie gruppiert.
    expect(fonts.every((f) => f.group === 'Supreme')).toBe(true)
    // Kurzform fuer die gruppierte Auswahl.
    expect(fonts.map((f) => f.faceLabel)).toEqual(['Light', 'Regular', 'Bold'])
  })

  it('gibt jedem Eintrag Gewicht, Stil und genau eine Datei', () => {
    const fonts = buildFontsFromFiles(['Supreme-Bold.woff2'])
    const bold = fonts[0]!
    expect(bold.weight).toBe('700')
    expect(bold.style).toBe('normal')
    expect(bold.family).toBe('Supreme')
    expect(bold.sources).toHaveLength(1)
    expect(bold.sources![0]!.url).toBe('/public/fonts/Supreme-Bold.woff2')
    expect(bold.sources![0]!.weight).toBe('700')
  })

  it('vergibt eindeutige IDs pro Schnitt', () => {
    const fonts = buildFontsFromFiles([
      'Supreme-Regular.woff2',
      'Supreme-Italic.woff2',
      'Supreme-Bold.woff2',
      'Supreme-BoldItalic.woff2',
    ])
    const ids = fonts.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toContain('datei:supreme:700:italic')
  })

  it('sortiert normal vor kursiv je Gewicht', () => {
    const fonts = buildFontsFromFiles([
      'Author-Bold.woff2',
      'Author-Regular.woff2',
      'Author-Italic.woff2',
      'Author-BoldItalic.woff2',
    ])
    expect(fonts.map((f) => f.faceLabel)).toEqual(['Regular', 'Italic', 'Bold', 'Bold Italic'])
  })

  it('kodiert Sonderzeichen im Dateinamen fuer die URL', () => {
    const fonts = buildFontsFromFiles(['Font Family-Bold.woff2'])
    // Leerzeichen im Namen -> in der URL kodiert, damit der Request stimmt.
    expect(fonts[0]!.sources![0]!.url).toBe('/public/fonts/Font%20Family-Bold.woff2')
  })

  it('trennt mehrere Familien', () => {
    const fonts = buildFontsFromFiles(['Supreme-Regular.woff2', 'Switzer-Bold.woff2'])
    expect(new Set(fonts.map((f) => f.group))).toEqual(new Set(['Supreme', 'Switzer']))
  })

  it('kommt mit einer leeren Liste klar', () => {
    expect(buildFontsFromFiles([])).toEqual([])
  })
})
