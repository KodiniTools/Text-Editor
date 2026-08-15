import type { Transform } from './textTransforms'
import * as T from './textTransforms'

export interface TransformItem {
  id: string
  label: string
  fn: Transform
}

export interface TransformGroup {
  label: string
  items: TransformItem[]
}

/** Alle Transformationen, gruppiert fuer das Menue. */
export const transformGroups: TransformGroup[] = [
  {
    label: 'Gross-/Kleinschreibung',
    items: [
      { id: 'upper', label: 'GROSSBUCHSTABEN', fn: T.toUpperCase },
      { id: 'lower', label: 'kleinbuchstaben', fn: T.toLowerCase },
      { id: 'title', label: 'Titel Schreibweise', fn: T.toTitleCase },
      { id: 'sentence', label: 'Satz-Schreibweise', fn: T.toSentenceCase },
      { id: 'toggle', label: 'gROSS/kLEIN umkehren', fn: T.toggleCase },
      { id: 'camel', label: 'camelCase', fn: T.toCamelCase },
      { id: 'snake', label: 'snake_case', fn: T.toSnakeCase },
      { id: 'kebab', label: 'kebab-case', fn: T.toKebabCase },
    ],
  },
  {
    label: 'Leerzeichen',
    items: [
      { id: 'trim', label: 'Anfang/Ende trimmen', fn: T.trimText },
      { id: 'trimLines', label: 'Zeilen trimmen', fn: T.trimLines },
      { id: 'removeEmpty', label: 'Leerzeilen entfernen', fn: T.removeEmptyLines },
      { id: 'collapse', label: 'Mehrfach-Leerzeichen reduzieren', fn: T.collapseSpaces },
      { id: 'tidy', label: 'Whitespace aufraeumen', fn: T.removeExtraWhitespace },
      { id: 'tab2space', label: 'Tabs -> Leerzeichen', fn: T.tabsToSpaces(2) },
      { id: 'space2tab', label: 'Leerzeichen -> Tabs', fn: T.spacesToTabs(2) },
    ],
  },
  {
    label: 'Zeilen',
    items: [
      { id: 'sortAsc', label: 'Sortieren A-Z', fn: T.sortLinesAsc },
      { id: 'sortDesc', label: 'Sortieren Z-A', fn: T.sortLinesDesc },
      { id: 'sortNum', label: 'Numerisch sortieren', fn: T.sortLinesNumeric },
      { id: 'reverseLines', label: 'Reihenfolge umkehren', fn: T.reverseLines },
      { id: 'shuffle', label: 'Zufaellig mischen', fn: T.shuffleLines },
      { id: 'dedupe', label: 'Duplikate entfernen', fn: T.removeDuplicateLines },
      { id: 'numberLines', label: 'Zeilen nummerieren', fn: T.numberLines },
    ],
  },
  {
    label: 'Umkehren',
    items: [
      { id: 'reverseText', label: 'Zeichen umkehren', fn: T.reverseText },
      { id: 'reverseWords', label: 'Woerter umkehren', fn: T.reverseWords },
    ],
  },
  {
    label: 'Kodierung',
    items: [
      { id: 'b64enc', label: 'Base64 kodieren', fn: T.base64Encode },
      { id: 'b64dec', label: 'Base64 dekodieren', fn: T.base64Decode },
      { id: 'urlenc', label: 'URL kodieren', fn: T.urlEncode },
      { id: 'urldec', label: 'URL dekodieren', fn: T.urlDecode },
      { id: 'htmlenc', label: 'HTML kodieren', fn: T.htmlEncode },
      { id: 'htmldec', label: 'HTML dekodieren', fn: T.htmlDecode },
    ],
  },
]
