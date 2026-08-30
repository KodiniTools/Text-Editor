import { describe, expect, it } from 'vitest'
import {
  PX_PER_MM,
  lineStepPx,
  mmToPx,
  pageCount,
  pageLineStepPx,
  paginateByLines,
} from '@/utils/renderPages'
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

describe('lineStepPx', () => {
  it('multipliziert Schriftgroesse mit Zeilenhoehe', () => {
    expect(lineStepPx(16, 1.7)).toBeCloseTo(27.2, 5)
    expect(lineStepPx(20, 1.5)).toBe(30)
  })

  it('faengt unsinnige Werte ab', () => {
    expect(lineStepPx(16, 0)).toBe(16)
    expect(lineStepPx(0, 1.7)).toBe(1)
  })
})

describe('pageLineStepPx', () => {
  it('rundet den Zeilenschritt auf ganze Pixel (kein gebrochenes Raster im PDF)', () => {
    // 16*1.7 = 27.2 -> 27; ganze px verhindern Rundungsdrift beim html2canvas-Raster.
    expect(pageLineStepPx(16, 1.7)).toBe(27)
    expect(pageLineStepPx(20, 1.5)).toBe(30)
    expect(pageLineStepPx(15, 1.7)).toBe(26) // 25.5 -> 26
  })

  it('bleibt mindestens 1 px', () => {
    expect(pageLineStepPx(0, 1.7)).toBe(1)
    expect(pageLineStepPx(16, 0)).toBe(16)
  })
})

describe('paginateByLines', () => {
  it('rundet die Seitenhoehe auf ganze Zeilen ab (keine Zeile wird geteilt)', () => {
    // A4-Inhaltshoehe 986 px, Zeilenschritt 27.2 -> 36 ganze Zeilen je Seite.
    const p = paginateByLines(2000, 986, 27.2)
    expect(p.linesPerPage).toBe(36)
    expect(p.pageStepPx).toBeCloseTo(979.2, 3)
    expect(p.pageStepPx).toBeLessThanOrEqual(986)
  })

  it('teilt den Inhalt an Zeilengrenzen in Seiten', () => {
    // 36 Zeilen je Seite: 36 Zeilen -> 1 Seite, 37 -> 2 Seiten.
    expect(paginateByLines(36 * 27.2, 986, 27.2).count).toBe(1)
    expect(paginateByLines(37 * 27.2, 986, 27.2).count).toBe(2)
    expect(paginateByLines(72 * 27.2, 986, 27.2).count).toBe(2)
    expect(paginateByLines(73 * 27.2, 986, 27.2).count).toBe(3)
  })

  it('mindestens eine Zeile je Seite und eine Seite gesamt', () => {
    // Riesige Schrift: Zeile hoeher als die Seite -> trotzdem 1 Zeile/Seite.
    const p = paginateByLines(0, 500, 800)
    expect(p.linesPerPage).toBe(1)
    expect(p.count).toBe(1)
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
