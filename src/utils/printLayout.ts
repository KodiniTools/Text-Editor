/**
 * Layout-Helfer fuer den Browser-Druck (Strg+P / "Drucken" im Editor).
 *
 * Frei platzierte Bilder liegen nicht im Dokument-HTML, sondern als
 * content-relative px-Koordinaten im Store. Der Druckcontainer (#print-root)
 * beginnt genau am Seitenrand (@page margin = DEFAULT_MARGIN_MM), daher
 * koennen die Editor-Koordinaten 1:1 als absolute Position uebernommen werden
 * -- wie in Vorschau, PDF- und HTML-Export (renderPages/exportHtml).
 */

import type { ImagePlacement } from '@/stores/editor'

type ImageBox = Pick<ImagePlacement, 'x' | 'y' | 'w' | 'h'>

/** Inline-Style eines Bildes im Druck (absolut, content-relativ, in px). */
export function printImageStyle(img: ImageBox): Record<string, string> {
  return {
    position: 'absolute',
    left: `${img.x}px`,
    top: `${img.y}px`,
    width: `${img.w}px`,
    height: `${img.h}px`,
    objectFit: 'fill',
  }
}

/**
 * Inline-Style des Druckcontainers: Mindesthoehe bis zur Unterkante des
 * tiefsten Bildes, damit Bilder unterhalb des Textes nicht abgeschnitten werden.
 * Ohne Bilder leer (kein Einfluss auf den reinen Textdruck).
 */
export function printRootStyle(images: readonly ImageBox[]): Record<string, string> {
  const bottom = images.reduce((max, img) => Math.max(max, img.y + img.h), 0)
  return bottom > 0 ? { minHeight: `${bottom}px` } : {}
}
