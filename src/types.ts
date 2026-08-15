import type { Transform } from '@/utils/textTransforms'
import type { FindOptions } from '@/utils/find'

/** Oeffentliche Methoden der EditorArea-Komponente (via defineExpose). */
export interface EditorApi {
  focusEditor: () => void
  applyTransform: (fn: Transform) => void
  insertText: (text: string) => void
  findNext: (query: string, opts: FindOptions) => boolean
  findPrev: (query: string, opts: FindOptions) => boolean
  replaceCurrent: (query: string, replacement: string, opts: FindOptions) => boolean
  replaceAll: (query: string, replacement: string, opts: FindOptions) => number
  countMatches: (query: string, opts: FindOptions) => number
}
