import { describe, expect, it } from 'vitest'
import { buildSearchRegex, countMatches, escapeRegExp } from '@/utils/find'

const base = { caseSensitive: false, wholeWord: false, regex: false }

describe('find utils', () => {
  it('escaped Sonderzeichen', () => {
    expect(escapeRegExp('a.b*c')).toBe('a\\.b\\*c')
  })
  it('leerer Begriff -> null', () => {
    expect(buildSearchRegex('', base)).toBeNull()
  })
  it('ungueltiges Regex -> null', () => {
    expect(buildSearchRegex('(', { ...base, regex: true })).toBeNull()
  })
  it('zaehlt case-insensitiv', () => {
    expect(countMatches('Test test TEST', 'test', base)).toBe(3)
  })
  it('case-sensitiv', () => {
    expect(countMatches('Test test TEST', 'test', { ...base, caseSensitive: true })).toBe(1)
  })
  it('ganzes Wort', () => {
    expect(countMatches('cat category cat', 'cat', { ...base, wholeWord: true })).toBe(2)
  })
  it('regex-modus', () => {
    expect(countMatches('a1 b2 c3', '\\d', { ...base, regex: true })).toBe(3)
  })
})
