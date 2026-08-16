import { describe, expect, it } from 'vitest'
import { comboFromEvent } from '@/composables/useKeyboardShortcuts'

/** Baut ein KeyboardEvent-aehnliches Objekt fuer comboFromEvent. */
function ev(part: Partial<KeyboardEvent>): KeyboardEvent {
  return {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...part,
  } as KeyboardEvent
}

describe('comboFromEvent', () => {
  it('erkennt Buchstaben aus e.code (layout-unabhaengig)', () => {
    expect(comboFromEvent(ev({ ctrlKey: true, code: 'KeyB', key: 'b' }))).toBe('mod+b')
    expect(comboFromEvent(ev({ metaKey: true, code: 'KeyI', key: 'i' }))).toBe('mod+i')
  })

  it('setzt die Modifikatoren in fester Reihenfolge mod+shift+alt', () => {
    expect(comboFromEvent(ev({ ctrlKey: true, shiftKey: true, code: 'KeyZ', key: 'z' }))).toBe(
      'mod+shift+z',
    )
    expect(comboFromEvent(ev({ ctrlKey: true, shiftKey: true, code: 'KeyG', key: 'g' }))).toBe(
      'mod+shift+g',
    )
  })

  it('liefert bei Alt+Ziffer die Ziffer -- auch wenn e.key ein Sonderzeichen ist (macOS)', () => {
    // Auf macOS ergibt Option+1 als e.key "¡"; e.code bleibt Digit1.
    expect(comboFromEvent(ev({ altKey: true, code: 'Digit1', key: '¡' }))).toBe('alt+1')
    expect(comboFromEvent(ev({ altKey: true, code: 'Digit9', key: '9' }))).toBe('alt+9')
  })

  it('erkennt Satzzeichen stabil trotz Shift (Punkt/Komma/Backslash/Slash)', () => {
    // Shift+Punkt liefert e.key ">"; ueber e.code bleibt es ".".
    expect(comboFromEvent(ev({ ctrlKey: true, shiftKey: true, code: 'Period', key: '>' }))).toBe(
      'mod+shift+.',
    )
    expect(comboFromEvent(ev({ ctrlKey: true, shiftKey: true, code: 'Comma', key: '<' }))).toBe(
      'mod+shift+,',
    )
    expect(comboFromEvent(ev({ ctrlKey: true, code: 'Backslash', key: '\\' }))).toBe('mod+\\')
    expect(comboFromEvent(ev({ ctrlKey: true, code: 'Slash', key: '/' }))).toBe('mod+/')
  })

  it('bildet Sondertasten ohne stabilen Code ueber e.key ab', () => {
    expect(comboFromEvent(ev({ code: 'Escape', key: 'Escape' }))).toBe('esc')
    expect(comboFromEvent(ev({ code: 'F1', key: 'F1' }))).toBe('f1')
  })

  it('ohne Modifikator bleibt es die blanke Taste (kein Kuerzel-Treffer)', () => {
    expect(comboFromEvent(ev({ code: 'KeyA', key: 'a' }))).toBe('a')
  })
})
