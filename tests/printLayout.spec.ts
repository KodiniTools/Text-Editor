import { describe, expect, it } from 'vitest'
import { printImageStyle, printRootStyle } from '@/utils/printLayout'

/**
 * Der Browser-Druck (#print-root) muss die frei platzierten Bilder an denselben
 * content-relativen Koordinaten ausgeben wie Editor, Vorschau und Exporte.
 */
describe('printLayout', () => {
  it('positioniert ein Bild absolut mit den Editor-Koordinaten', () => {
    expect(printImageStyle({ x: 120, y: 340, w: 200, h: 150 })).toEqual({
      position: 'absolute',
      left: '120px',
      top: '340px',
      width: '200px',
      height: '150px',
      objectFit: 'fill',
    })
  })

  it('reserviert Hoehe bis zur Unterkante des tiefsten Bildes', () => {
    const images = [
      { x: 0, y: 100, w: 50, h: 50 }, // Unterkante 150
      { x: 10, y: 400, w: 300, h: 220 }, // Unterkante 620
    ]
    expect(printRootStyle(images)).toEqual({ minHeight: '620px' })
  })

  it('setzt ohne Bilder keine Mindesthoehe', () => {
    expect(printRootStyle([])).toEqual({})
  })
})
