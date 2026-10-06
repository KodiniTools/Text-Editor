import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { themeColorsV2 } from '@/design-system/tokens-v2'
import { contrastRatio } from '@/design-system/__tests__/tokenTestUtils'

function vueFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? vueFiles(path) : name.endsWith('.vue') ? [path] : []
  })
}

// Klassen-Strings mit Gold-Fläche (bg-accent bzw. hover:bg-accent, nicht accent-soft)
const FILLED = /(?<![\w:-])(?:hover:)?bg-accent(?![\w/-])/
const TEXT = /(?<![\w:-])(?:hover:)?text-[a-z]/

describe('Kontrast der Gold-Buttons', () => {
  it.each(['light', 'dark'] as const)(
    '%s: on-accent erfüllt WCAG AA auf accent und accent-hover',
    (theme) => {
      const colors = themeColorsV2(theme)
      expect(contrastRatio(colors.onAccent, colors.accent)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.onAccent, colors.accentHover)).toBeGreaterThanOrEqual(4.5)
    },
  )

  it('Text auf Gold-Flächen nutzt immer text-on-accent', () => {
    const offenders: string[] = []
    for (const file of vueFiles(join(__dirname, '..', 'src'))) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/"[^"\n]*"|'[^'\n]*'/g)) {
        const cls = m[0]
        if (!FILLED.test(cls) || !TEXT.test(cls)) continue
        // Jede Textfarbe, die auf der Gold-Fläche landet, muss on-accent sein
        const onGold = cls
          .split(/\s+/)
          .filter((c) =>
            /^(hover:)?text-(ink|link|surface|white|danger|success|info|warning)/.test(c),
          )
        if (onGold.length > 0 && !cls.includes('text-on-accent')) offenders.push(`${file}: ${cls}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
