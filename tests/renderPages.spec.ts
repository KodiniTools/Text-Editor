import { describe, expect, it } from 'vitest'
import { PX_PER_MM, mmToPx, pageCount } from '@/utils/renderPages'
import { safeFileName } from '@/utils/exportPdf'

describe('renderPages Masse', () => {
  it('rechnet mm in px bei 96 dpi um', () => {
    expect(PX_PER_MM).toBeCloseTo(3.7795, 3)
    expect(mmToPx(210)).toBeCloseTo(793.7, 1) // A4-Breite
    expect(mmToPx(297)).toBeCloseTo(1122.5, 1) // A4-Hoehe
  })

  it('berechnet die Seitenzahl', () => {
    expect(pageCount(0, 1000)).toBe(1) // leer -> 1 Seite
    expect(pageCount(500, 1000)).toBe(1)
    expect(pageCount(1000, 1000)).toBe(1)
    expect(pageCount(1001, 1000)).toBe(2)
    expect(pageCount(2500, 1000)).toBe(3)
  })

  it('liefert mindestens eine Seite bei ungueltiger Hoehe', () => {
    expect(pageCount(1000, 0)).toBe(1)
    expect(pageCount(-5, 1000)).toBe(1)
  })

  it('ignoriert winzige Messfehler an der Seitengrenze', () => {
    // 1000.00005 soll nicht faelschlich eine zweite Seite ausloesen.
    expect(pageCount(1000.00005, 1000)).toBe(1)
  })
})

describe('safeFileName', () => {
  it('entfernt unzulaessige Zeichen', () => {
    expect(safeFileName('Mein/Doc:Titel?')).toBe('MeinDocTitel')
    expect(safeFileName('  a   b  ')).toBe('a b')
  })

  it('faellt bei leerem Namen auf einen Standard zurueck', () => {
    expect(safeFileName('')).toBe('dokument')
    expect(safeFileName('   ')).toBe('dokument')
    expect(safeFileName('///')).toBe('dokument')
  })
})
