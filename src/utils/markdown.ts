import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

/**
 * Rendert Markdown zu bereinigtem HTML.
 * DOMPurify verhindert XSS aus eingefuegtem Markdown/HTML.
 */
export function renderMarkdown(source: string): string {
  const raw = marked.parse(source, { async: false }) as string
  return DOMPurify.sanitize(raw)
}
