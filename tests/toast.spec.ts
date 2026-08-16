import { beforeEach, describe, expect, it } from 'vitest'
import { _resetToastsForTests, useToast } from '@/composables/useToast'

beforeEach(() => {
  localStorage.clear()
  _resetToastsForTests()
})

describe('useToast', () => {
  it('zeigt eine Meldung und vergibt eine ID', () => {
    const { toasts, showToast } = useToast()
    const id = showToast('Hallo', { duration: 0 })
    expect(id).not.toBeNull()
    expect(toasts.value.length).toBe(1)
    expect(toasts.value[0]!.message).toBe('Hallo')
  })

  it('entfernt eine Meldung per dismiss', () => {
    const { toasts, showToast, dismiss } = useToast()
    const id = showToast('Weg', { duration: 0 })!
    dismiss(id)
    expect(toasts.value.length).toBe(0)
  })

  it('"Nicht mehr anzeigen" unterdrueckt kuenftige Meldungen desselben Schluessels', () => {
    const { toasts, showToast, muteKey, isMuted } = useToast()
    showToast('Kopiert', { key: 'copy', duration: 0 })
    expect(toasts.value.length).toBe(1)
    // Stummschalten: offene Meldung verschwindet, isMuted greift.
    muteKey('copy')
    expect(toasts.value.length).toBe(0)
    expect(isMuted('copy')).toBe(true)
    // Neue Meldung mit gleichem Schluessel erscheint nicht mehr.
    const id = showToast('Kopiert', { key: 'copy', duration: 0 })
    expect(id).toBeNull()
    expect(toasts.value.length).toBe(0)
  })

  it('merkt die Stummschaltung im localStorage', () => {
    const { showToast, muteKey } = useToast()
    showToast('X', { key: 'save', duration: 0 })
    muteKey('save')
    const raw = localStorage.getItem('kodini-editor-muted-toasts-v1')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toContain('save')
  })

  it('unterdrueckt Meldungen ohne Schluessel nie (Fehler bleiben sichtbar)', () => {
    const { toasts, showToast } = useToast()
    showToast('Fehler A', { type: 'error', duration: 0 })
    showToast('Fehler B', { type: 'error', duration: 0 })
    expect(toasts.value.length).toBe(2)
  })
})
