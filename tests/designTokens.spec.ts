/**
 * Regressionsschutz für die Design-Tokens der Oberfläche.
 *
 * Die Oberfläche läuft auf den gemeinsamen KodiniTools-Tokens (--ds-*, siehe
 * src/design-system/README.md). Tailwind kennt nur noch semantische Farbklassen
 * (surface, line, ink, accent, on-accent, link, Status); die Variablen wechseln
 * mit dem Theme. Diese Tests verhindern die Rückkehr der alten Palette, von
 * dark:-Varianten, Gradients, Blur, Karten-Schatten und Tailwind-Standardgrau
 * und stellen sicher, dass Supreme in allen genutzten Gewichten geladen wird.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const SRC_DIR = join(__dirname, '..', 'src')

function collectVueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collectVueFiles(full, out)
    } else if (entry.endsWith('.vue')) {
      out.push(full)
    }
  }
  return out
}

/** Liefert alle Zeilen (Datei:Zeile), in denen das Muster vorkommt. */
function findInVueFiles(pattern: RegExp): string[] {
  const hits: string[] = []
  for (const file of collectVueFiles(SRC_DIR)) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        hits.push(`${relative(SRC_DIR, file)}:${index + 1}`)
      }
    })
  }
  return hits
}

describe('Design-Tokens in Vue-Komponenten', () => {
  it('nutzen keine Klassen der alten Palette (primary, slate, cream, navy, warm, muted, accent-dark …)', () => {
    const legacy =
      /\b(?:bg|text|border|ring|from|to|via|fill|stroke|accent|divide|outline|placeholder)-(?:primary|slate|cream|navy|warm|muted|surface-(?:light|dark|darker)|accent-(?:dark|light|ink))(?:\b|\/)/
    expect(findInVueFiles(legacy)).toEqual([])
  })

  it('nutzen keine Tailwind-Standardfarben (slate-500, green-600, white/20 …)', () => {
    const defaults =
      /\b(?:bg|text|border|ring|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text|border)-white\/\d+/
    expect(findInVueFiles(defaults)).toEqual([])
  })

  it('nutzen keine dark:-Varianten mehr (die Tokens wechseln mit dem Theme)', () => {
    expect(findInVueFiles(/\bdark:/)).toEqual([])
  })

  it('nutzen keine Gradients, Blur, Blob-Animation oder Karten-Schatten', () => {
    const effects =
      /\b(?:bg-gradient-to-\w+|backdrop-blur(?:-\w+)?|blur-3xl|animate-blob|(?:hover:)?shadow-(?:sm|md|lg|xl|2xl)|hover:scale-\d+|hover:-translate-y-\d+)\b/
    expect(findInVueFiles(effects)).toEqual([])
  })

  it('nutzen nur die drei Radien und die Token-Dauern', () => {
    expect(findInVueFiles(/\brounded-(?:xl|2xl|3xl)\b|\bduration-\d+\b/)).toEqual([])
  })

  it('setzen Fokus über den Fokus-Ring der Tokens statt focus:ring-*', () => {
    expect(findInVueFiles(/\bfocus:ring-/)).toEqual([])
  })

  it('nutzen keine undefinierten Farbklassen (text-text, text-text-dark)', () => {
    expect(findInVueFiles(/\btext-text(?:-dark)?\b/)).toEqual([])
  })

  it('bleiben in der Token-Skala text-xs … text-3xl (kein text-base, keine Pixelwerte)', () => {
    expect(
      findInVueFiles(
        /\btext-(?:base|[4-9]xl)\b|\btext-\[[^\]]+\]|\bleading-(?:relaxed|snug|loose)\b/,
      ),
    ).toEqual([])
  })
})

describe('Typografie-Brücke', () => {
  const tailwindConfig = readFileSync(join(SRC_DIR, '..', 'tailwind.config.js'), 'utf8')
  const styleCss = readFileSync(join(SRC_DIR, 'style.css'), 'utf8')

  it.each(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'])(
    'text-%s kommt aus dem gleichnamigen Token',
    (step) => {
      expect(tailwindConfig).toMatch(new RegExp(`'?${step}'?: \\['var\\(--ds-text-${step}\\)'`))
    },
  )

  it('bindet Schriftfamilie, Gewichte und Zeilenhöhen an Tokens', () => {
    expect(tailwindConfig).toContain("sans: 'var(--ds-font-sans)'")
    expect(tailwindConfig).toContain("semibold: 'var(--ds-weight-semibold)'")
    expect(tailwindConfig).toContain("tight: 'var(--ds-leading-tight)'")
  })

  it('setzt die Grundgröße des Body wie der Playlist Generator auf --ds-text-lg', () => {
    expect(styleCss).toMatch(/body \{[^}]*font-size: var\(--ds-text-lg\)/)
  })
})

describe('UI-Schrift Supreme', () => {
  const styleCss = readFileSync(join(SRC_DIR, 'style.css'), 'utf8')

  it.each([400, 500, 700])('deklariert @font-face für Gewicht %i', (weight) => {
    const faces = styleCss.match(/@font-face\s*{[^}]*}/g) ?? []
    const supremeFaces = faces.filter((face) => /font-family:\s*'Supreme'/.test(face))
    const match = supremeFaces.find((face) => new RegExp(`font-weight:\\s*${weight}\\b`).test(face))
    expect(match, `Kein @font-face für Supreme ${weight}`).toBeDefined()
    expect(match).toMatch(/\.\/assets\/fonts\/Supreme-(Regular|Medium|Bold)\.woff2/)
  })
})
