import { describe, expect, it } from 'vitest'
import { htmlToMarkdown } from '@/utils/htmlToMarkdown'

describe('htmlToMarkdown', () => {
  it('wandelt Ueberschriften um', () => {
    expect(htmlToMarkdown('<h1>Titel</h1>')).toBe('# Titel')
    expect(htmlToMarkdown('<h2>Zwei</h2>')).toBe('## Zwei')
    expect(htmlToMarkdown('<h3>Drei</h3>')).toBe('### Drei')
  })

  it('wandelt Fett/Kursiv um -- als Tags UND als span-Styles (execCommand)', () => {
    expect(htmlToMarkdown('<div><b>fett</b></div>')).toBe('**fett**')
    expect(htmlToMarkdown('<div><em>kursiv</em></div>')).toBe('*kursiv*')
    expect(htmlToMarkdown('<div><span style="font-weight: bold">x</span></div>')).toBe('**x**')
    expect(htmlToMarkdown('<div><span style="font-style: italic">y</span></div>')).toBe('*y*')
    expect(htmlToMarkdown('<div><span style="font-weight: 700">z</span></div>')).toBe('**z**')
  })

  it('kombiniert Fett und Kursiv zu ***', () => {
    expect(htmlToMarkdown('<div><b><i>beides</i></b></div>')).toBe('***beides***')
  })

  it('ignoriert Farbe (kein Markdown-Aequivalent), behaelt aber den Text', () => {
    expect(htmlToMarkdown('<div><span style="color: #ff0000">rot</span></div>')).toBe('rot')
  })

  it('wandelt Aufzaehlungs- und nummerierte Listen um', () => {
    expect(htmlToMarkdown('<ul><li>eins</li><li>zwei</li></ul>')).toBe('- eins\n- zwei')
    expect(htmlToMarkdown('<ol><li>eins</li><li>zwei</li></ol>')).toBe('1. eins\n2. zwei')
  })

  it('rueckt verschachtelte Listen ein', () => {
    const html = '<ul><li>oben<ul><li>innen</li></ul></li></ul>'
    expect(htmlToMarkdown(html)).toBe('- oben\n  - innen')
  })

  it('trennt aufeinanderfolgende Zeilen mit hartem Umbruch (portabel)', () => {
    // Zwei Leerzeichen am Zeilenende = Markdown-Hard-Break -> auch in fremden
    // Renderern (GitHub, VS Code, pandoc) bleiben es getrennte Zeilen.
    expect(htmlToMarkdown('<div>eins</div><div>zwei</div>')).toBe('eins  \nzwei')
    expect(htmlToMarkdown('<div>a<br>b</div>')).toBe('a  \nb')
  })

  it('macht aus leeren Zeilen einen Absatztrenner', () => {
    expect(htmlToMarkdown('<div>a</div><div><br></div><div>b</div>')).toBe('a\n\nb')
  })

  it('setzt Leerzeilen um Ueberschriften und Listen', () => {
    const html = '<div>vor</div><h2>Titel</h2><div>nach</div>'
    expect(htmlToMarkdown(html)).toBe('vor\n\n## Titel\n\nnach')
  })

  it('laesst getippte Markdown-Syntax unveraendert (nicht maskiert)', () => {
    expect(htmlToMarkdown('<div># Getippt</div>')).toBe('# Getippt')
    expect(htmlToMarkdown('<div>- Punkt</div>')).toBe('- Punkt')
  })

  it('kombiniertes Dokument', () => {
    const html =
      '<h1>Notizen</h1><div>Ein <b>wichtiger</b> Absatz.</div><ul><li>a</li><li>b</li></ul>'
    expect(htmlToMarkdown(html)).toBe('# Notizen\n\nEin **wichtiger** Absatz.\n\n- a\n- b')
  })

  it('durchdringt Wrapper-Divs um Listen (echte Editor-Struktur)', () => {
    // execCommand verpackt Listen oft in ein <div>.
    expect(htmlToMarkdown('<div><ul><li>x</li><li>y</li></ul></div>')).toBe('- x\n- y')
    const real =
      '<h1>Projektplan</h1>' +
      '<div><span style="font-weight: bold;">Wichtig</span></div>' +
      '<div><ul><li>Punkt eins</li></ul></div>'
    expect(htmlToMarkdown(real)).toBe('# Projektplan\n\n**Wichtig**\n\n- Punkt eins')
  })

  it('rettet eine (ungueltig) in einer Ueberschrift steckende Liste', () => {
    // So sieht die kaputte Struktur aus, wenn man Ueberschrift + Liste kombiniert.
    expect(htmlToMarkdown('<h1><ol><li>b</li><li>c</li></ol></h1>')).toBe('1. b\n2. c')
    expect(htmlToMarkdown('<h1>Titel<ol><li>x</li></ol></h1>')).toBe('# Titel\n\n1. x')
  })

  it('leerer Inhalt -> leerer String', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(htmlToMarkdown('<div><br></div>')).toBe('')
  })
})
