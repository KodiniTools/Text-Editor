import { ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import { useI18n } from '@/i18n'
import { useToast } from '@/composables/useToast'
import { pageRenderOptions } from '@/utils/pageRenderOptions'
import { buildHtmlDocument } from '@/utils/exportHtml'
import { htmlToMarkdown } from '@/utils/htmlToMarkdown'
import { renderPdf, safeFileName } from '@/utils/exportPdf'
import { downloadBlob } from '@/utils/files'
import { blobToFile, shareFile, shareText, textToFile, type ShareOutcome } from '@/utils/share'
import { findFont, loadFont } from '@/config/fonts'

/** Formate, in denen das aktive Dokument geteilt werden kann (= Export-Formate). */
export type ShareFormat = 'txt' | 'md' | 'html' | 'html-source' | 'pdf'

/** Teilbarer Inhalt: Datei fuer den Share-Dialog plus Text-Fallback (txt/md). */
interface SharePayload {
  file: File
  /** Reiner Text, falls der Browser share() kann, aber keine Dateien. */
  text?: string
}

/**
 * Teilen des aktiven Dokuments ueber die Web Share API. Nutzt dieselben
 * Export-Pfade wie "Speichern" (Markdown-Konverter, HTML-Export, PDF-Renderer),
 * damit geteilte Dateien 1:1 den heruntergeladenen entsprechen.
 *
 * Fallback-Kette je Format:
 *  1. Datei teilen (navigator.share mit files)
 *  2. txt/md: nur Text teilen, wenn Dateien nicht unterstuetzt werden
 *  3. Datei herunterladen (wie "Speichern") + Hinweis
 * Ein vom Nutzer abgebrochener Dialog loest keinen Fallback aus.
 */
export function useShareDocument() {
  const store = useEditorStore()
  const { t } = useI18n()
  const { showToast } = useToast()

  /** Laeuft gerade ein Teilen-Vorgang (PDF-Rendern dauert)? */
  const sharing = ref(false)

  function title(): string {
    return store.activeTitle || t.value.doc.untitled
  }

  async function buildPayload(format: ShareFormat): Promise<SharePayload> {
    const base = safeFileName(title())
    switch (format) {
      case 'txt': {
        const text = store.activePlain
        return { file: textToFile(text, `${base}.txt`, 'text/plain'), text }
      }
      case 'md': {
        const text = htmlToMarkdown(store.activeHtml)
        return { file: textToFile(text, `${base}.md`, 'text/markdown'), text }
      }
      case 'html': {
        const html = buildHtmlDocument({
          ...pageRenderOptions(store.settings, store.activeContent, store.activeImages),
          title: title(),
          lang: document.documentElement.lang || 'de',
        })
        return { file: textToFile(html, `${base}.html`, 'text/html') }
      }
      case 'html-source':
        return { file: textToFile(store.activePlain, `${base}.html`, 'text/html') }
      case 'pdf': {
        // Wie beim PDF-Export: Schrift vor dem Rastern laden.
        await loadFont(findFont(store.settings.fontFamily))
        const { blob } = await renderPdf({
          ...pageRenderOptions(store.settings, store.activeContent, store.activeImages),
          fileName: base,
        })
        return { file: blobToFile(blob, `${base}.pdf`, 'application/pdf') }
      }
      default: {
        const never: never = format
        throw new Error(`unknown share format: ${String(never)}`)
      }
    }
  }

  /** Letzte Stufe: Datei wie beim Speichern herunterladen und Hinweis zeigen. */
  function fallbackDownload(payload: SharePayload): void {
    downloadBlob(payload.file, payload.file.name, payload.file.type)
    showToast(t.value.toast.shareFallback, { type: 'info', key: 'share' })
  }

  async function share(format: ShareFormat): Promise<ShareOutcome | 'error'> {
    if (sharing.value || !store.activeDoc) return 'error'
    sharing.value = true
    try {
      const payload = await buildPayload(format)
      let outcome = await shareFile(payload.file, title())
      if (outcome === 'unsupported' && payload.text !== undefined) {
        outcome = await shareText(payload.text, title())
      }
      if (outcome === 'shared') showToast(t.value.toast.shared, { key: 'share' })
      else if (outcome !== 'cancelled') fallbackDownload(payload)
      return outcome
    } catch {
      showToast(t.value.toast.shareFailed, { type: 'error' })
      return 'error'
    } finally {
      sharing.value = false
    }
  }

  return { share, sharing }
}
