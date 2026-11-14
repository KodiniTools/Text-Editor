/**
 * Regressionsschutz gegen den Layout-Shift beim Start der Startseite (CLS).
 *
 * Vor dem Mount zeigt index.html ein statisches Skelett. Gilt dabei schon die
 * feste App-Shell (body = 100 % hoch, kein html.ktx-scroll), schrumpft #app und
 * der Footer steht im ersten Viewport; setzt erst der Router die Klasse, springt
 * er ans Seitenende (Lighthouse: CLS 0,18). Darum traegt <html> die Klasse
 * statisch, nur die Shell-Routen /app und /preview legen sie vor dem ersten
 * Paint wieder ab, und das Skelett ist mindestens eine Fensterhoehe hoch.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8')

/** Inline-Skript aus index.html mit gegebenem Pfad ausfuehren, Klassen zurueckgeben. */
function runInlineScript(pathname: string, base = '/texteditor/'): string[] {
  const match = html.match(/<script>([\s\S]*?)<\/script>/)
  expect(match).not.toBeNull()
  const classes = new Set<string>(['ktx-scroll'])
  const documentElement = {
    classList: {
      add: (c: string) => classes.add(c),
      remove: (c: string) => classes.delete(c),
    },
    setAttribute: () => undefined,
  }
  const fn = new Function(
    'document',
    'location',
    'localStorage',
    'matchMedia',
    match![1].replace(/%BASE_URL%/g, base),
  )
  fn({ documentElement }, { pathname }, { getItem: () => null }, () => ({ matches: false }))
  return [...classes]
}

describe('index.html: kein Layout-Shift beim Start', () => {
  it('setzt html.ktx-scroll statisch (scrollende Seite als Standard)', () => {
    expect(html).toMatch(/<html[^>]*\bclass="[^"]*\bktx-scroll\b/)
  })

  it('Skelett ist mindestens eine Fensterhoehe hoch', () => {
    const rule = html.match(/\.ktx-prerender\s*\{[^}]*\}/)?.[0] ?? ''
    expect(rule).toMatch(/min-height:\s*100vh/)
  })

  it('Shell-Routen legen die Klasse vor dem ersten Paint ab', () => {
    expect(runInlineScript('/texteditor/app')).not.toContain('ktx-scroll')
    expect(runInlineScript('/texteditor/app/')).not.toContain('ktx-scroll')
    expect(runInlineScript('/texteditor/preview')).not.toContain('ktx-scroll')
    expect(runInlineScript('/app', '/')).not.toContain('ktx-scroll')
  })

  it('scrollende Routen behalten die Klasse', () => {
    for (const p of [
      '/texteditor/',
      '/texteditor',
      '/texteditor/funktionen',
      '/texteditor/blog',
      '/texteditor/apple',
    ]) {
      expect(runInlineScript(p)).toContain('ktx-scroll')
    }
    expect(runInlineScript('/', '/')).toContain('ktx-scroll')
  })
})
