import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadGlobalNav } from '@/utils/globalNav'

/** Baut eine fetch-Antwort mit dem gegebenen Text/Status. */
function response(body: string, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    text: () => Promise.resolve(body),
    headers: new Headers({ 'content-type': 'text/html' }),
  } as unknown as Response
}

const FALLBACK = '<nav class="global-nav">EINGEBACKEN</nav>'
const LIVE = '<nav class="global-nav">LIVE-SERVER</nav>'

beforeEach(() => {
  document.body.innerHTML = `<div id="global-nav-slot">${FALLBACK}</div>`
})

afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('loadGlobalNav', () => {
  it('ersetzt den Fallback durch die Live-Navigation', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response(LIVE))),
    )
    await loadGlobalNav()
    const slot = document.getElementById('global-nav-slot')!
    expect(slot.innerHTML).toContain('LIVE-SERVER')
    expect(slot.innerHTML).not.toContain('EINGEBACKEN')
  })

  it('holt das wurzel-relative Server-Partial', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(response(LIVE)))
    vi.stubGlobal('fetch', fetchMock)
    await loadGlobalNav()
    expect(fetchMock).toHaveBeenCalledWith('/partials/nav.html', expect.any(Object))
  })

  it('behaelt den Fallback, wenn der Abruf fehlschlaegt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    )
    await loadGlobalNav()
    expect(document.getElementById('global-nav-slot')!.innerHTML).toContain('EINGEBACKEN')
  })

  it('behaelt den Fallback bei HTTP-Fehler', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response('<h1>500</h1>', false))),
    )
    await loadGlobalNav()
    expect(document.getElementById('global-nav-slot')!.innerHTML).toContain('EINGEBACKEN')
  })

  it('uebernimmt keine SPA-Fallback-/Fehlerseite ohne Navigations-Kennung', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(response('<!doctype html><div id="app"></div>'))),
    )
    await loadGlobalNav()
    expect(document.getElementById('global-nav-slot')!.innerHTML).toContain('EINGEBACKEN')
  })

  it('macht nichts, wenn der Slot fehlt', async () => {
    document.body.innerHTML = ''
    const fetchMock = vi.fn(() => Promise.resolve(response(LIVE)))
    vi.stubGlobal('fetch', fetchMock)
    await expect(loadGlobalNav()).resolves.toBeUndefined()
    // Ohne Slot wird gar nicht erst geladen.
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
