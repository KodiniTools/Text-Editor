import type { Transform } from './textTransforms'
import * as T from './textTransforms'
import type { Messages } from '@/i18n/messages'

export interface TransformItem {
  /** Schluessel in messages.transforms -- liefert die uebersetzte Beschriftung. */
  id: keyof Messages['transforms']
  fn: Transform
}

export interface TransformGroup {
  /** Schluessel in messages.transformGroups. */
  id: keyof Messages['transformGroups']
  items: TransformItem[]
}

/**
 * Alle Transformationen, gruppiert fuers Menue. Die Beschriftungen liegen in
 * der i18n-Tabelle (messages.ts) -- hier stehen nur die stabilen Schluessel und
 * die Funktionen. `id` ist gegen die Messages getippt, ein Tippfehler oder eine
 * fehlende Uebersetzung ist damit ein Compilerfehler.
 */
export const transformGroups: TransformGroup[] = [
  {
    id: 'case',
    items: [
      { id: 'upper', fn: T.toUpperCase },
      { id: 'lower', fn: T.toLowerCase },
      { id: 'title', fn: T.toTitleCase },
      { id: 'sentence', fn: T.toSentenceCase },
      { id: 'toggle', fn: T.toggleCase },
      { id: 'camel', fn: T.toCamelCase },
      { id: 'snake', fn: T.toSnakeCase },
      { id: 'kebab', fn: T.toKebabCase },
    ],
  },
  {
    id: 'whitespace',
    items: [
      { id: 'trim', fn: T.trimText },
      { id: 'trimLines', fn: T.trimLines },
      { id: 'removeEmpty', fn: T.removeEmptyLines },
      { id: 'collapse', fn: T.collapseSpaces },
      { id: 'tidy', fn: T.removeExtraWhitespace },
      { id: 'tab2space', fn: T.tabsToSpaces(2) },
      { id: 'space2tab', fn: T.spacesToTabs(2) },
    ],
  },
  {
    id: 'lines',
    items: [
      { id: 'sortAsc', fn: T.sortLinesAsc },
      { id: 'sortDesc', fn: T.sortLinesDesc },
      { id: 'sortNum', fn: T.sortLinesNumeric },
      { id: 'reverseLines', fn: T.reverseLines },
      { id: 'shuffle', fn: T.shuffleLines },
      { id: 'dedupe', fn: T.removeDuplicateLines },
      { id: 'numberLines', fn: T.numberLines },
    ],
  },
  {
    id: 'reverse',
    items: [
      { id: 'reverseText', fn: T.reverseText },
      { id: 'reverseWords', fn: T.reverseWords },
    ],
  },
  {
    id: 'encoding',
    items: [
      { id: 'b64enc', fn: T.base64Encode },
      { id: 'b64dec', fn: T.base64Decode },
      { id: 'urlenc', fn: T.urlEncode },
      { id: 'urldec', fn: T.urlDecode },
      { id: 'htmlenc', fn: T.htmlEncode },
      { id: 'htmldec', fn: T.htmlDecode },
    ],
  },
]
