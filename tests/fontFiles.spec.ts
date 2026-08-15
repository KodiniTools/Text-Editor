import { describe, expect, it } from 'vitest'
import {
  fontExtension,
  groupFontFiles,
  parseFontFileName,
  prettifyFamily,
  sortByFormatPreference,
} from '@/utils/fontFiles'

describe('fontExtension', () => {
  it('erkennt Schriftformate', () => {
    expect(fontExtension('a.woff2')).toBe('woff2')
    expect(fontExtension('a.WOFF')).toBe('woff')
    expect(fontExtension('a.ttf')).toBe('ttf')
    expect(fontExtension('a.otf')).toBe('otf')
  })

  it('lehnt alles andere ab', () => {
    expect(fontExtension('logo.png')).toBeNull()
    expect(fontExtension('readme.txt')).toBeNull()
    expect(fontExtension('ohne-endung')).toBeNull()
  })
})

describe('prettifyFamily', () => {
  it('macht aus Dateinamen lesbare Beschriftungen', () => {
    expect(prettifyFamily('KodiniSans')).toBe('Kodini Sans')
    expect(prettifyFamily('Open_Sans')).toBe('Open Sans')
    expect(prettifyFamily('roboto')).toBe('Roboto')
    expect(prettifyFamily('PTSerif')).toBe('PT Serif')
    expect(prettifyFamily('Inter')).toBe('Inter')
  })
})

describe('parseFontFileName', () => {
  it('liest Familie und Schnitt', () => {
    expect(parseFontFileName('KodiniSans-Regular.woff2')).toMatchObject({
      familyKey: 'KodiniSans',
      label: 'Kodini Sans',
      weight: '400',
      style: 'normal',
    })
    expect(parseFontFileName('KodiniSans-Bold.woff2')).toMatchObject({
      weight: '700',
      style: 'normal',
    })
    expect(parseFontFileName('KodiniSans-Italic.woff2')).toMatchObject({
      weight: '400',
      style: 'italic',
    })
    expect(parseFontFileName('KodiniSans-BoldItalic.woff2')).toMatchObject({
      weight: '700',
      style: 'italic',
    })
    expect(parseFontFileName('KodiniSans-SemiBold.woff2')).toMatchObject({ weight: '600' })
    expect(parseFontFileName('KodiniSans-ExtraLight.woff2')).toMatchObject({ weight: '200' })
  })

  it('versteht numerische Schnitte', () => {
    expect(parseFontFileName('Inter-700.woff2')).toMatchObject({
      familyKey: 'Inter',
      weight: '700',
    })
    expect(parseFontFileName('Inter-300italic.woff2')).toMatchObject({
      weight: '300',
      style: 'italic',
    })
  })

  it('behandelt Variable Fonts als kompletten Bereich', () => {
    expect(parseFontFileName('Roboto-VariableFont_wght.ttf')).toMatchObject({
      familyKey: 'Roboto',
      weight: '100 900',
    })
  })

  it('nimmt ohne erkennbaren Schnitt den ganzen Namen als Familie', () => {
    // 'Display' ist kein Schnitt -- darf nicht abgeschnitten werden.
    expect(parseFontFileName('Playfair-Display.woff2')).toMatchObject({
      familyKey: 'Playfair-Display',
      weight: '400',
    })
    expect(parseFontFileName('KodiniBrand.woff2')).toMatchObject({
      familyKey: 'KodiniBrand',
      label: 'Kodini Brand',
      weight: '400',
    })
  })

  it('ignoriert Dateien, die keine Schriften sind', () => {
    expect(parseFontFileName('vorschau.png')).toBeNull()
    expect(parseFontFileName('.gitkeep')).toBeNull()
  })
})

describe('groupFontFiles', () => {
  it('fasst Schnitte einer Familie zusammen', () => {
    const groups = groupFontFiles([
      'KodiniSans-Regular.woff2',
      'KodiniSans-Bold.woff2',
      'KodiniSans-Italic.woff2',
      'Inter-Regular.woff2',
    ])
    expect(groups).toHaveLength(2)
    const kodini = groups.find((g) => g.label === 'Kodini Sans')!
    expect(kodini.files).toHaveLength(3)
    expect(kodini.files.map((f) => f.weight).sort()).toEqual(['400', '400', '700'])
  })

  it('sortiert alphabetisch, damit die Auswahl stabil bleibt', () => {
    const groups = groupFontFiles(['Zeta-Regular.woff2', 'Alpha-Regular.woff2'])
    expect(groups.map((g) => g.label)).toEqual(['Alpha', 'Zeta'])
  })

  it('nimmt bei doppeltem Schnitt nur eine Datei', () => {
    // Derselbe Schnitt als woff2 und ttf -- sonst laedt der Browser beides.
    const groups = groupFontFiles(
      sortByFormatPreference(['Kodini-Regular.ttf', 'Kodini-Regular.woff2']),
    )
    expect(groups[0]!.files).toHaveLength(1)
    expect(groups[0]!.files[0]!.file).toBe('Kodini-Regular.woff2')
  })

  it('ueberspringt Nicht-Schriftdateien', () => {
    const groups = groupFontFiles(['LICENSE.txt', 'muster.png', 'Kodini-Regular.woff2'])
    expect(groups).toHaveLength(1)
  })

  it('kommt mit einem leeren Ordner klar', () => {
    expect(groupFontFiles([])).toEqual([])
  })
})

describe('sortByFormatPreference', () => {
  it('stellt woff2 nach vorn', () => {
    expect(sortByFormatPreference(['a.otf', 'a.woff2', 'a.ttf', 'a.woff'])).toEqual([
      'a.woff2',
      'a.woff',
      'a.ttf',
      'a.otf',
    ])
  })
})
