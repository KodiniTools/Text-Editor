import { beforeEach, describe, expect, it } from 'vitest'
import {
  HANDOFF_MAX_AGE_MS,
  HANDOFF_STORAGE_KEY,
  handoffContent,
  handoffDocumentName,
  readHandoff,
  type HandoffDocument,
} from '@/utils/handoff'

const NOW = 1_700_000_000_000

function store(value: unknown): void {
  localStorage.setItem(
    HANDOFF_STORAGE_KEY,
    typeof value === 'string' ? value : JSON.stringify(value),
  )
}

function entry(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    version: 1,
    source: 'playlist_generator',
    name: 'techno.csv',
    content: 'Filename,Title,Size (Bytes)\nTape Stop FX 7.wav,Tape Stop FX 7,49380880',
    mimeType: 'text/csv',
    sharedAt: NOW - 1000,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('readHandoff', () => {
  it('liefert einen gueltigen Eintrag und entfernt ihn aus dem localStorage', () => {
    store(entry())
    const doc = readHandoff(NOW)
    expect(doc?.name).toBe('techno.csv')
    expect(doc?.content).toContain('Tape Stop FX 7.wav')
    expect(doc?.source).toBe('playlist_generator')
    expect(localStorage.getItem(HANDOFF_STORAGE_KEY)).toBeNull()
    expect(readHandoff(NOW)).toBeNull()
  })

  it('liefert null ohne Eintrag', () => {
    expect(readHandoff(NOW)).toBeNull()
  })

  it.each([
    ['kaputtes JSON', '{nicht json'],
    ['falsche Version', entry({ version: 2 })],
    ['fehlender Inhalt', entry({ content: undefined })],
    ['Inhalt kein String', entry({ content: 42 })],
    ['Name kein String', entry({ name: null })],
    ['mimeType kein String', entry({ mimeType: 7 })],
    ['veraltet', entry({ sharedAt: NOW - HANDOFF_MAX_AGE_MS - 1 })],
  ])('verwirft %s und raeumt den Eintrag trotzdem weg', (_label, value) => {
    store(value)
    expect(readHandoff(NOW)).toBeNull()
    expect(localStorage.getItem(HANDOFF_STORAGE_KEY)).toBeNull()
  })

  it('akzeptiert einen Eintrag ohne mimeType', () => {
    store(entry({ mimeType: undefined }))
    expect(readHandoff(NOW)?.mimeType).toBeUndefined()
  })
})

describe('handoffDocumentName / handoffContent', () => {
  const base: HandoffDocument = {
    source: 'playlist_generator',
    name: 'meine_wiedergabeliste.m3u',
    content: '#EXTM3U\n#EXTINF:0,Track\ntrack.mp3',
    sharedAt: NOW,
  }

  it('entfernt die Dateiendung aus dem Dokumentnamen', () => {
    expect(handoffDocumentName(base)).toBe('meine_wiedergabeliste')
    expect(handoffDocumentName({ ...base, name: 'ohne-endung' })).toBe('ohne-endung')
    expect(handoffDocumentName({ ...base, name: '  liste.tar.gz ' })).toBe('liste.tar')
  })

  it('uebernimmt reinen Text unveraendert', () => {
    expect(handoffContent(base)).toBe(base.content)
  })

  it('uebernimmt Markup als Quelltext, damit Tags sichtbar bleiben', () => {
    const xml = '<playlist>\n  <a href="x">Titel</a>\n</playlist>'
    const result = handoffContent({ ...base, name: 'liste.xspf', content: xml })
    expect(result).not.toContain('<a href')
    expect(result).toContain('&lt;a href=')
    expect(result.startsWith('<div>')).toBe(true)
  })
})
