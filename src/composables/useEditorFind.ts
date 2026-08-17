import { type Ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { buildSearchRegex, countMatches as countInText, type FindOptions } from '@/utils/find'

interface EditorFindOptions {
  editable: Ref<HTMLElement | null>
  /** Feldinhalt nach einer Ersetzung in den Store schreiben. */
  syncFromDom: () => void
  /** Cursor-Position nach dem Auswaehlen eines Treffers melden. */
  reportCursor: () => void
}

/**
 * Suchen & Ersetzen ueber die Textknoten des contenteditable-Feldes. Arbeitet
 * bewusst auf den Text-Nodes (nicht auf reinem Text-String), damit die
 * vorhandene Auszeichnung (Fett/Kursiv/Farbe/Links ...) beim Weitersuchen und
 * beim Ersetzen erhalten bleibt.
 */
export function useEditorFind({ editable, syncFromDom, reportCursor }: EditorFindOptions) {
  const store = useEditorStore()

  function textNodes(): Text[] {
    const el = editable.value
    if (!el) return []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const nodes: Text[] = []
    let n = walker.nextNode()
    while (n) {
      nodes.push(n as Text)
      n = walker.nextNode()
    }
    return nodes
  }

  function fullText(nodes: Text[]): string {
    return nodes.map((n) => n.nodeValue ?? '').join('')
  }

  function pointAt(nodes: Text[], offset: number): { node: Text; offset: number } | null {
    let acc = 0
    for (const node of nodes) {
      const len = node.nodeValue?.length ?? 0
      if (offset <= acc + len) return { node, offset: offset - acc }
      acc += len
    }
    const last = nodes[nodes.length - 1]
    return last ? { node: last, offset: last.nodeValue?.length ?? 0 } : null
  }

  function selectionOffset(nodes: Text[]): number {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return 0
    const range = sel.getRangeAt(0)
    let acc = 0
    for (const node of nodes) {
      if (node === range.endContainer) return acc + range.endOffset
      acc += node.nodeValue?.length ?? 0
    }
    return 0
  }

  function selectOffsets(nodes: Text[], start: number, end: number): void {
    const a = pointAt(nodes, start)
    const b = pointAt(nodes, end)
    if (!a || !b) return
    const range = document.createRange()
    range.setStart(a.node, a.offset)
    range.setEnd(b.node, b.offset)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    const rect = range.getBoundingClientRect()
    const host = editable.value?.closest('.page-backdrop, .plain-scroll') as HTMLElement | null
    if (host && rect.height) {
      const hostRect = host.getBoundingClientRect()
      if (rect.top < hostRect.top || rect.bottom > hostRect.bottom) {
        host.scrollTop += rect.top - hostRect.top - host.clientHeight / 2
      }
    }
    reportCursor()
  }

  function findNext(query: string, opts: FindOptions): boolean {
    const nodes = textNodes()
    const text = fullText(nodes)
    const re = buildSearchRegex(query, opts, true)
    if (!re) return false
    re.lastIndex = selectionOffset(nodes)
    let m = re.exec(text)
    if (!m) {
      re.lastIndex = 0
      m = re.exec(text)
    }
    if (!m) return false
    editable.value?.focus()
    selectOffsets(nodes, m.index, m.index + m[0].length)
    return true
  }

  function findPrev(query: string, opts: FindOptions): boolean {
    const nodes = textNodes()
    const text = fullText(nodes)
    const re = buildSearchRegex(query, opts, true)
    if (!re) return false
    const sel = window.getSelection()
    const limit = sel && sel.rangeCount > 0 ? offsetOfStart(nodes, sel.getRangeAt(0)) : text.length
    let last: RegExpExecArray | null = null
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      if (m.index < limit) last = m
      else break
      if (m[0] === '') re.lastIndex++
    }
    if (!last) {
      re.lastIndex = 0
      while ((m = re.exec(text)) !== null) {
        last = m
        if (m[0] === '') re.lastIndex++
      }
    }
    if (!last) return false
    editable.value?.focus()
    selectOffsets(nodes, last.index, last.index + last[0].length)
    return true
  }

  function offsetOfStart(nodes: Text[], range: Range): number {
    let acc = 0
    for (const node of nodes) {
      if (node === range.startContainer) return acc + range.startOffset
      acc += node.nodeValue?.length ?? 0
    }
    return 0
  }

  function replaceCurrent(query: string, replacement: string, opts: FindOptions): boolean {
    const sel = window.getSelection()
    const re = buildSearchRegex(query, opts, false)
    if (!re || !sel || sel.rangeCount === 0 || sel.isCollapsed) return findNext(query, opts)
    const selected = sel.toString()
    if (!re.test(selected)) return findNext(query, opts)
    const range = sel.getRangeAt(0)
    range.deleteContents()
    const node = document.createTextNode(replacement)
    range.insertNode(node)
    const after = document.createRange()
    after.setStartAfter(node)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)
    syncFromDom()
    return findNext(query, opts)
  }

  function replaceAll(query: string, replacement: string, opts: FindOptions): number {
    const re = buildSearchRegex(query, opts, true)
    if (!re) return 0
    let count = 0
    for (const node of textNodes()) {
      const value = node.nodeValue ?? ''
      re.lastIndex = 0
      const next = value.replace(re, () => {
        count++
        return replacement
      })
      if (next !== value) node.nodeValue = next
    }
    if (count > 0) syncFromDom()
    return count
  }

  function countMatches(query: string, opts: FindOptions): number {
    const text = editable.value ? fullText(textNodes()) : store.activePlain
    return countInText(text, query, opts)
  }

  return { findNext, findPrev, replaceCurrent, replaceAll, countMatches }
}
