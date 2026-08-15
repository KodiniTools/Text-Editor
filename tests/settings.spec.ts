import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { DEFAULT_SETTINGS, normalizeSettings, useEditorStore } from '@/stores/editor'
import { ALL_FONTS, customFont, findFont, isKnownFont, loadFont } from '@/config/fonts'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

describe('normalizeSettings', () => {
  it('ergaenzt fehlende Felder aus alten Staenden', () => {
    // So sah der gespeicherte Stand vor der Format-Leiste aus.
    const alt = { theme: 'dark', fontFamily: 'serif', fontSize: 18 } as const
    const s = normalizeSettings(alt)
    expect(s.theme).toBe('dark')
    expect(s.fontFamily).toBe('serif')
    expect(s.fontSize).toBe(18)
    expect(s.letterSpacing).toBe(DEFAULT_SETTINGS.letterSpacing)
    expect(s.textColor).toBe('')
    expect(s.textAlign).toBe('left')
  })

  it('faellt bei unbekannter Schrift auf die Standardschrift zurueck', () => {
    expect(normalizeSettings({ fontFamily: 'entfernte-schrift' }).fontFamily).toBe(
      DEFAULT_SETTINGS.fontFamily,
    )
  })

  it('begrenzt Zahlen auf den gueltigen Bereich', () => {
    expect(normalizeSettings({ fontSize: 999 }).fontSize).toBe(42)
    expect(normalizeSettings({ fontSize: 1 }).fontSize).toBe(10)
    expect(normalizeSettings({ lineHeight: 99 }).lineHeight).toBe(3)
    expect(normalizeSettings({ letterSpacing: -50 }).letterSpacing).toBe(-1)
  })

  it('faengt kaputte Zahlen ab', () => {
    expect(normalizeSettings({ fontSize: NaN }).fontSize).toBe(DEFAULT_SETTINGS.fontSize)
    expect(normalizeSettings({ lineHeight: 'gross' as unknown as number }).lineHeight).toBe(
      DEFAULT_SETTINGS.lineHeight,
    )
  })

  it('laesst nur sauberes Hex als Textfarbe durch', () => {
    expect(normalizeSettings({ textColor: '#1d4ed8' }).textColor).toBe('#1d4ed8')
    expect(normalizeSettings({ textColor: '' }).textColor).toBe('')
    // Wird als Inline-Style verwendet -> alles andere muss verworfen werden.
    expect(normalizeSettings({ textColor: 'red; background: url(x)' }).textColor).toBe('')
    expect(normalizeSettings({ textColor: 'javascript:alert(1)' }).textColor).toBe('')
    expect(normalizeSettings({ textColor: '#fff' }).textColor).toBe('')
  })

  it('verwirft unbekannte Ausrichtung', () => {
    expect(normalizeSettings({ textAlign: 'schraeg' as never }).textAlign).toBe('left')
    expect(normalizeSettings({ textAlign: 'justify' }).textAlign).toBe('justify')
  })
})

describe('editor store - Darstellung', () => {
  it('uebernimmt gueltige Werte', () => {
    const store = useEditorStore()
    store.updateSettings({ fontSize: 22, lineHeight: 2, textColor: '#b91c1c', textAlign: 'center' })
    expect(store.settings.fontSize).toBe(22)
    expect(store.settings.lineHeight).toBe(2)
    expect(store.settings.textColor).toBe('#b91c1c')
    expect(store.settings.textAlign).toBe('center')
  })

  it('begrenzt auch Werte, die ueber updateSettings kommen', () => {
    const store = useEditorStore()
    store.updateSettings({ fontSize: 500 })
    expect(store.settings.fontSize).toBe(42)
  })

  it('setzt mit resetFormatting nur die Darstellung zurueck', () => {
    const store = useEditorStore()
    store.updateSettings({ theme: 'dark', fontSize: 28, textColor: '#15803d', showPreview: true })
    store.resetFormatting()
    expect(store.settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
    expect(store.settings.textColor).toBe('')
    // Design und Vorschau gehoeren nicht zur Darstellung des Textes.
    expect(store.settings.theme).toBe('dark')
    expect(store.settings.showPreview).toBe(true)
  })

  it('laedt gespeicherte Settings beim naechsten Start wieder', async () => {
    const first = useEditorStore()
    first.updateSettings({ fontSize: 24, fontFamily: 'mono' })
    // Der Persistenz-Watcher laeuft erst im naechsten Tick.
    await nextTick()
    setActivePinia(createPinia())
    const second = useEditorStore()
    expect(second.settings.fontSize).toBe(24)
    expect(second.settings.fontFamily).toBe('mono')
  })

  it('repariert einen manipulierten localStorage-Stand', () => {
    localStorage.setItem(
      'kodini-editor-settings-v1',
      JSON.stringify({ fontSize: 900, fontFamily: 'gibtsnicht', textColor: 'rot' }),
    )
    const store = useEditorStore()
    expect(store.settings.fontSize).toBe(42)
    expect(store.settings.fontFamily).toBe(DEFAULT_SETTINGS.fontFamily)
    expect(store.settings.textColor).toBe('')
  })
})

describe('Schriften-Registry', () => {
  it('kennt die Systemschriften', () => {
    expect(isKnownFont('sans')).toBe(true)
    expect(isKnownFont('mono')).toBe(true)
    expect(isKnownFont('phantasie')).toBe(false)
  })

  it('liefert fuer unbekannte IDs eine benutzbare Schrift', () => {
    expect(findFont('phantasie').stack).toBe(findFont('sans').stack)
  })

  it('jede Schrift hat eine eindeutige ID', () => {
    const ids = ALL_FONTS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('customFont ergaenzt den Ordnerpfad und einen Fallback', () => {
    const f = customFont('kodini', 'Kodini Sans', 'KodiniSans', [
      { url: 'KodiniSans-Regular.woff2' },
      { url: 'KodiniSans-Bold.woff2', weight: '700' },
    ])
    expect(f.sources?.[0]?.url).toBe('/public/fonts/KodiniSans-Regular.woff2')
    expect(f.sources?.[1]?.weight).toBe('700')
    // Fallback im Stack, damit ein Ladefehler nicht zu unlesbarem Text fuehrt.
    expect(f.stack).toContain('"KodiniSans"')
    expect(f.stack).toContain('sans-serif')
  })

  it('laesst absolute URLs unveraendert', () => {
    const f = customFont('x', 'X', 'X', [{ url: '/fonts/X.woff2' }])
    expect(f.sources?.[0]?.url).toBe('/fonts/X.woff2')
  })

  it('loadFont ist fuer Systemschriften ein No-op', async () => {
    await expect(loadFont(findFont('sans'))).resolves.toBe(true)
  })

  it('loadFont wirft nicht, wenn die Umgebung keine Fonts laden kann', async () => {
    const f = customFont('kodini', 'Kodini Sans', 'KodiniSans', [{ url: 'fehlt.woff2' }])
    await expect(loadFont(f)).resolves.toBe(false)
  })
})
