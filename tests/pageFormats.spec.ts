import { describe, expect, it } from 'vitest'
import {
  PAGE_FORMATS,
  isOrientation,
  isPageFormatId,
  pageAspect,
  pageDimensions,
  pageSizeCss,
} from '@/utils/pageFormats'

describe('pageFormats', () => {
  it('kennt die gaengigen Formate', () => {
    expect(PAGE_FORMATS.map((f) => f.id)).toEqual(['a3', 'a4', 'a5', 'letter', 'legal'])
    const a4 = PAGE_FORMATS.find((f) => f.id === 'a4')!
    expect(a4).toMatchObject({ widthMm: 210, heightMm: 297 })
  })

  it('validiert IDs und Ausrichtung', () => {
    expect(isPageFormatId('a4')).toBe(true)
    expect(isPageFormatId('none')).toBe(true)
    expect(isPageFormatId('a7')).toBe(false)
    expect(isOrientation('portrait')).toBe(true)
    expect(isOrientation('diagonal')).toBe(false)
  })

  it('tauscht Breite/Hoehe im Querformat', () => {
    expect(pageDimensions('a4', 'portrait')).toEqual({ widthMm: 210, heightMm: 297 })
    expect(pageDimensions('a4', 'landscape')).toEqual({ widthMm: 297, heightMm: 210 })
    expect(pageDimensions('none', 'portrait')).toBeNull()
  })

  it('liefert das Seitenverhaeltnis', () => {
    expect(pageAspect('a4', 'portrait')).toBeCloseTo(210 / 297, 5)
    expect(pageAspect('a4', 'landscape')).toBeCloseTo(297 / 210, 5)
    expect(pageAspect('none', 'portrait')).toBeNull()
  })

  it('baut die @page-Groesse und faellt bei none auf A4 zurueck', () => {
    expect(pageSizeCss('a4', 'portrait')).toBe('210mm 297mm')
    expect(pageSizeCss('a3', 'landscape')).toBe('420mm 297mm')
    expect(pageSizeCss('none', 'portrait')).toBe('210mm 297mm')
  })
})
