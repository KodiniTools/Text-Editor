import { describe, expect, it } from 'vitest'
import * as T from '@/utils/textTransforms'

describe('textTransforms - Schreibweise', () => {
  it('title case', () => {
    expect(T.toTitleCase('hallo welt')).toBe('Hallo Welt')
  })
  it('sentence case', () => {
    expect(T.toSentenceCase('hallo. wie geht es? gut')).toBe('Hallo. Wie geht es? Gut')
  })
  it('toggle case', () => {
    expect(T.toggleCase('AbC')).toBe('aBc')
  })
  it('camelCase', () => {
    expect(T.toCamelCase('hallo welt test')).toBe('halloWeltTest')
  })
  it('snake_case / kebab-case', () => {
    expect(T.toSnakeCase('Hallo Welt')).toBe('hallo_welt')
    expect(T.toKebabCase('Hallo Welt')).toBe('hallo-welt')
  })
})

describe('textTransforms - Zeilen', () => {
  it('sortiert aufsteigend', () => {
    expect(T.sortLinesAsc('c\na\nb')).toBe('a\nb\nc')
  })
  it('numerisch sortieren', () => {
    expect(T.sortLinesNumeric('10\n2\n1')).toBe('1\n2\n10')
  })
  it('entfernt Duplikate (erstes bleibt)', () => {
    expect(T.removeDuplicateLines('a\nb\na\nc\nb')).toBe('a\nb\nc')
  })
  it('kehrt Zeilen um', () => {
    expect(T.reverseLines('1\n2\n3')).toBe('3\n2\n1')
  })
  it('entfernt Leerzeilen', () => {
    expect(T.removeEmptyLines('a\n\n b \n\nc')).toBe('a\n b \nc')
  })
})

describe('textTransforms - Whitespace & Umkehr', () => {
  it('collapse spaces', () => {
    expect(T.collapseSpaces('a    b')).toBe('a b')
  })
  it('trim lines', () => {
    expect(T.trimLines('  a  \n b ')).toBe('a\nb')
  })
  it('reverse text (unicode-sicher)', () => {
    expect(T.reverseText('abc')).toBe('cba')
  })
})

describe('textTransforms - Kodierung (Roundtrip)', () => {
  it('base64 roundtrip mit Umlauten', () => {
    const s = 'Grüße aus Zürich – ✓'
    expect(T.base64Decode(T.base64Encode(s))).toBe(s)
  })
  it('url roundtrip', () => {
    const s = 'a b&c=1'
    expect(T.urlDecode(T.urlEncode(s))).toBe(s)
  })
  it('html encode', () => {
    expect(T.htmlEncode('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;')
  })
  it('html roundtrip', () => {
    const s = '<b>"A" & \'B\'</b>'
    expect(T.htmlDecode(T.htmlEncode(s))).toBe(s)
  })
})
