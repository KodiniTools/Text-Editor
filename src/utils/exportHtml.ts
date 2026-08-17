/**
 * HTML-Export: erzeugt ein eigenstaendiges (self-contained) HTML-Dokument aus
 * einem Editor-Dokument. Nutzt dieselben Render-Optionen wie Vorschau/PDF
 * (Typografie, Inhalt, frei platzierte Bilder), damit die Darstellung
 * uebereinstimmt -- der Text bleibt aber echter, auswaehlbarer Text (kein
 * Rasterbild). Bilder sind bereits data:-URLs, das Dokument braucht also keine
 * externen Dateien.
 */

import type { PageRenderOptions } from './renderPages'
import { DEFAULT_MARGIN_MM, mmToPx } from './renderPages'

export interface HtmlDocOptions extends PageRenderOptions {
  /** Dokumenttitel (fuer <title>). */
  title: string
  /** Sprachkennung fuer <html lang>. */
  lang?: string
}

/** Maskiert Text fuer die Verwendung in HTML-Attributen/Elementen. */
function esc(s: string): string {
  return s.replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c,
  )
}

/**
 * Baut das komplette HTML-Dokument als String. Rein (kein DOM/Download) --
 * dadurch gut testbar.
 */
export function buildHtmlDocument(opts: HtmlDocOptions): string {
  const t = opts.typography
  const marginMm = opts.marginMm ?? DEFAULT_MARGIN_MM
  const contentW = Math.round(mmToPx(opts.widthMm) - 2 * mmToPx(marginMm))
  const images = opts.images ?? []
  const maxImgBottom = images.reduce((m, im) => Math.max(m, im.y + im.h), 0)

  const docStyle = [
    `font-family:${t.fontStack}`,
    `font-weight:${t.fontWeight}`,
    `font-style:${t.fontStyle}`,
    `font-size:${t.fontSizePx}px`,
    `line-height:${t.lineHeight}`,
    `letter-spacing:${t.letterSpacingPx}px`,
    `text-align:${t.textAlign}`,
    `color:${t.color}`,
    `white-space:${t.wrap ? 'pre-wrap' : 'pre'}`,
    'overflow-wrap:break-word',
    'word-break:normal',
    'margin:0',
  ].join(';')

  const wrapStyle =
    `position:relative;width:${contentW}px;max-width:100%;margin:2rem auto;padding:0 1rem` +
    (maxImgBottom > 0 ? `;min-height:${maxImgBottom}px` : '')

  const imgHtml = images
    .map(
      (im) =>
        `<img alt="" src="${esc(im.src)}" style="position:absolute;left:${im.x}px;top:${im.y}px;` +
        `width:${im.w}px;height:${im.h}px;object-fit:fill" />`,
    )
    .join('\n    ')

  //   statt <br> nicht noetig -- leerer Inhalt bekommt einen Zeilenumbruch.
  const body = opts.html && opts.html.length > 0 ? opts.html : '<br>'

  return `<!doctype html>
<html lang="${esc(opts.lang || 'de')}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="generator" content="Kodini Texteditor" />
    <title>${esc(opts.title) || 'Dokument'}</title>
    <style>
      :root {
        color-scheme: light;
      }
      html,
      body {
        margin: 0;
        background: #ffffff;
      }
      .kodini-doc {
        ${docStyle};
      }
      .kodini-wrap {
        ${wrapStyle};
      }
      .kodini-wrap :where(div, p) {
        margin: 0;
        padding: 0;
      }
      .kodini-doc blockquote {
        margin: 0.2em 0;
        padding: 0 0 0 1em;
        border-left: 3px solid rgba(161, 161, 170, 0.6);
        font-style: italic;
      }
      .kodini-doc mark {
        background-color: #fde68a;
        color: #111827;
        border-radius: 2px;
        padding: 0 1px;
      }
      .kodini-doc a {
        color: #1d4ed8;
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <main class="kodini-wrap">
      <article class="kodini-doc">${body}</article>
      ${imgHtml}
    </main>
  </body>
</html>
`
}
