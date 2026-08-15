import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { de, en } from '@/i18n/messages'
import { LOCALES, messages, setLocale, useI18n } from '@/i18n'
import { transformGroups } from '@/utils/transformRegistry'

/** Sammelt alle Schluesselpfade eines verschachtelten Nachrichtenobjekts. */
function keyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...keyPaths(value as Record<string, unknown>, path))
    } else {
      paths.push(path)
    }
  }
  return paths.sort()
}

beforeEach(() => {
  localStorage.clear()
  setLocale('de')
})
afterEach(() => setLocale('de'))

describe('Nachrichten DE/EN', () => {
  it('haben exakt dieselbe Schluesselstruktur', () => {
    // TypeScript erzwingt das schon; dieser Test faengt es auch zur Laufzeit ab.
    expect(keyPaths(en)).toEqual(keyPaths(de))
  })

  it('haben keine leeren Uebersetzungen', () => {
    for (const locale of LOCALES) {
      const msgs = locale === 'de' ? de : en
      for (const path of keyPaths(msgs as Record<string, unknown>)) {
        const value = path
          .split('.')
          .reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], msgs)
        if (typeof value === 'string') {
          expect(value.trim(), `${locale}.${path} ist leer`).not.toBe('')
        }
      }
    }
  })
})

describe('Transformationen sind vollstaendig uebersetzt', () => {
  it('jede Gruppe und jeder Eintrag hat eine Beschriftung in beiden Sprachen', () => {
    for (const msgs of [de, en]) {
      for (const group of transformGroups) {
        expect(msgs.transformGroups[group.id], `Gruppe ${group.id}`).toBeTruthy()
        for (const item of group.items) {
          expect(msgs.transforms[item.id], `Transform ${item.id}`).toBeTruthy()
        }
      }
    }
  })

  it('hat keine ueberzaehligen Transform-Uebersetzungen', () => {
    const used = new Set(transformGroups.flatMap((g) => g.items.map((i) => i.id)))
    for (const key of Object.keys(de.transforms)) {
      expect(used.has(key as (typeof transformGroups)[number]['items'][number]['id']), key).toBe(
        true,
      )
    }
  })
})

describe('Pluralisierung und Zahlen', () => {
  it('Trefferzahl im Deutschen', () => {
    expect(de.find.matches(0)).toBe('Keine Treffer')
    expect(de.find.matches(1)).toBe('1 Treffer')
    expect(de.find.matches(5)).toBe('5 Treffer')
  })

  it('Trefferzahl im Englischen (Singular/Plural)', () => {
    expect(en.find.matches(0)).toBe('No matches')
    expect(en.find.matches(1)).toBe('1 match')
    expect(en.find.matches(5)).toBe('5 matches')
  })

  it('Lesezeit', () => {
    expect(de.status.readingTime(0)).toBe('0 Min')
    expect(de.status.readingTime(3)).toBe('3 Min Lesezeit')
    expect(en.status.readingTime(0)).toBe('0 min')
    expect(en.status.readingTime(3)).toBe('3 min read')
  })
})

describe('Sprachwechsel', () => {
  it('messages() liefert die Nachrichten der aktuellen Sprache', () => {
    expect(messages().toolbar.new).toBe('Neu')
    setLocale('en')
    expect(messages().toolbar.new).toBe('New')
  })

  it('das reaktive t folgt dem Sprachwechsel', () => {
    const { t, setLocale: set } = useI18n()
    set('de')
    expect(t.value.toolbar.find).toBe('Suchen')
    set('en')
    expect(t.value.toolbar.find).toBe('Find')
  })

  it('merkt sich die Sprache im localStorage', () => {
    setLocale('en')
    expect(localStorage.getItem('kodini-editor-locale-v1')).toBe('en')
  })

  it('setzt <html lang>', () => {
    setLocale('en')
    expect(document.documentElement.lang).toBe('en')
    setLocale('de')
    expect(document.documentElement.lang).toBe('de')
  })

  it('ignoriert unbekannte Sprachen', () => {
    setLocale('de')
    setLocale('fr' as never)
    expect(messages().toolbar.new).toBe('Neu')
  })
})
