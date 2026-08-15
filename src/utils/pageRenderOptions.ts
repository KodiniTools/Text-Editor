/**
 * Leitet aus den Editor-Einstellungen die Render-Optionen fuer Vorschau und
 * PDF-Export ab -- eine gemeinsame Quelle, damit beide identisch sind.
 */

import type { EditorSettings } from '@/stores/editor'
import { findFont } from '@/config/fonts'
import { pageDimensions } from '@/utils/pageFormats'
import type { PageRenderOptions } from '@/utils/renderPages'
import { contentToHtml } from '@/utils/richText'

/** Ohne gewaehltes Format wird A4 Hochformat verwendet (wie beim Drucken). */
const FALLBACK = { widthMm: 210, heightMm: 297 }

/**
 * @param content Roh gespeicherter Inhalt (HTML oder aelterer reiner Text) --
 *   wird hier zu bereinigtem HTML fuer Vorschau/PDF gemacht.
 */
export function pageRenderOptions(settings: EditorSettings, content: string): PageRenderOptions {
  const font = findFont(settings.fontFamily)
  const dims = pageDimensions(settings.pageFormat, settings.pageOrientation) ?? FALLBACK
  return {
    html: contentToHtml(content),
    widthMm: dims.widthMm,
    heightMm: dims.heightMm,
    typography: {
      fontStack: font.stack,
      fontWeight: font.weight ?? '400',
      fontStyle: font.style ?? 'normal',
      fontSizePx: settings.fontSize,
      lineHeight: settings.lineHeight,
      letterSpacingPx: settings.letterSpacing,
      textAlign: settings.textAlign,
      // Auf weissem Papier immer lesbar: eigene Textfarbe oder dunkles Grau.
      color: settings.textColor || '#111827',
      wrap: settings.wordWrap,
    },
  }
}
