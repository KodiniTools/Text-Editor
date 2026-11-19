// KodiniTools setzt keine Analyse-, Marketing- oder Tracking-Dienste ein
// (Entscheidung 20.11.2026): kein Consent Mode, kein Cookie-Banner, kein gtag.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (f: string) => readFileSync(resolve(__dirname, '..', f), 'utf8')

describe('ohne Tracking', () => {
  it('index.html bindet weder Consent Mode noch Cookie-Banner ein', () => {
    const html = read('index.html')
    expect(html).not.toMatch(/INJECT:(consent-mode|cookie-banner)|googletagmanager|gtag/)
  })

  it('Footer verweist nicht mehr auf Cookie-Einstellungen', () => {
    expect(read('partials/footer.html')).not.toMatch(/CookieConsent|cookieSettings/)
  })
})
