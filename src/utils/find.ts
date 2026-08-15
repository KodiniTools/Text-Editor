export interface FindOptions {
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}

/** Escaped Regex-Sonderzeichen fuer Literal-Suche. */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Baut ein RegExp aus Suchbegriff + Optionen.
 * Gibt null zurueck bei leerem Begriff oder ungueltigem Regex.
 */
export function buildSearchRegex(
  query: string,
  opts: FindOptions,
  global = false,
): RegExp | null {
  if (query === '') return null
  let pattern = opts.regex ? query : escapeRegExp(query)
  if (opts.wholeWord) pattern = `\\b${pattern}\\b`
  const flags = `${global ? 'g' : ''}${opts.caseSensitive ? '' : 'i'}u`
  try {
    return new RegExp(pattern, flags)
  } catch {
    // 'u'-Flag kann bei manchen Patterns scheitern -> ohne u erneut versuchen
    try {
      return new RegExp(pattern, `${global ? 'g' : ''}${opts.caseSensitive ? '' : 'i'}`)
    } catch {
      return null
    }
  }
}

/** Zaehlt alle Treffer im Text. */
export function countMatches(text: string, query: string, opts: FindOptions): number {
  const re = buildSearchRegex(query, opts, true)
  if (!re) return 0
  return (text.match(re) ?? []).length
}
