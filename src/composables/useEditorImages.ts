import { nextTick, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'
import { useEditorStore, type ImagePlacement } from '@/stores/editor'
import { normalizeUrl, sanitizeUrl } from '@/utils/richText'
import { useAnchoredMenu } from '@/composables/useAnchoredMenu'
import type { PageMetrics } from '@/composables/usePageView'

interface EditorImagesOptions {
  editable: Ref<HTMLElement | null>
  /** Scroll-Container der Seiten-Ansicht (fuer die Start-Platzierung). */
  host: Ref<HTMLElement | null>
  metrics: ComputedRef<PageMetrics | null>
  zoom: ComputedRef<number>
  pageActive: ComputedRef<boolean>
  /** Neu-Vermessung der Inhaltshoehe (aus usePageView). */
  measure: () => void
}

const MIN_IMAGE = 24

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Frei platzierte Bilder der Seiten-Ansicht: einfuegen (mit Verkleinerung auf
 * data-URL), verschieben, skalieren, loeschen und optional verlinken. Position
 * und Groesse sind content-relativ, damit sie mit Vorschau/PDF/HTML-Export
 * deckungsgleich sind.
 */
export function useEditorImages({
  editable,
  host,
  metrics,
  zoom,
  pageActive,
  measure,
}: EditorImagesOptions) {
  const store = useEditorStore()
  const selectedImageId = ref<string | null>(null)

  /** Bild-Overlay-Style (content-relativ; sitzt im skalierten Blatt). */
  function imageStyle(img: ImagePlacement): Record<string, string> {
    const m = metrics.value
    const left = (m ? m.margin : 0) + img.x
    const top = (m ? m.margin : 0) + img.y
    return { left: `${left}px`, top: `${top}px`, width: `${img.w}px`, height: `${img.h}px` }
  }

  /** Verkleinert das Bild (max. Kante 1400 px) und liefert eine data-URL. */
  function downscaleImage(file: File): Promise<{ src: string; w: number; h: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        URL.revokeObjectURL(url)
        const MAX = 1400
        const scale = Math.min(1, MAX / Math.max(image.naturalWidth, image.naturalHeight))
        const cw = Math.max(1, Math.round(image.naturalWidth * scale))
        const ch = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('no-2d-context'))
          return
        }
        ctx.drawImage(image, 0, 0, cw, ch)
        // PNG/GIF/WEBP behalten Transparenz (PNG), Fotos werden als JPEG kleiner.
        const keepAlpha = /image\/(png|gif|webp)/i.test(file.type)
        const src = canvas.toDataURL(keepAlpha ? 'image/png' : 'image/jpeg', 0.85)
        resolve({ src, w: cw, h: ch })
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('image-load-error'))
      }
      image.src = url
    })
  }

  /**
   * Fuegt ein Bild ein. Ohne Seitenformat wird A4 gewaehlt (freie Platzierung ist
   * nur mit fester Seitenbreite exakt). Startgroesse ~60 % der Inhaltsbreite,
   * zentriert, ungefaehr in der Mitte des Sichtbereichs.
   */
  async function insertImageFile(file: File): Promise<boolean> {
    if (!file.type.startsWith('image/')) return false
    let img: { src: string; w: number; h: number }
    try {
      img = await downscaleImage(file)
    } catch {
      return false
    }
    if (!pageActive.value) store.updateSettings({ pageFormat: 'a4', pageOrientation: 'portrait' })
    await nextTick()
    const m = metrics.value
    if (!m) return false
    const aspect = img.w / img.h
    const w = Math.min(img.w, Math.round(m.contentW * 0.6))
    const h = Math.max(1, Math.round(w / aspect))
    const x = Math.max(0, Math.round((m.contentW - w) / 2))
    let y = 0
    const hostEl = host.value
    if (hostEl) {
      const center = hostEl.scrollTop + hostEl.clientHeight / 2
      y = Math.max(0, Math.round((center - 16 - m.margin * zoom.value) / zoom.value - h / 2))
    }
    const id = store.addImage({ src: img.src, x, y, w, h })
    if (!id) return false
    selectedImageId.value = id
    editable.value?.blur()
    nextTick(measure)
    return true
  }

  function selectImage(id: string): void {
    selectedImageId.value = id
    editable.value?.blur()
  }

  function deleteImage(id: string): void {
    store.removeImage(id)
    if (selectedImageId.value === id) selectedImageId.value = null
  }

  /* ---------- Bild verlinken ---------- */
  // Kleines Popover direkt an der Link-Schaltflaeche des Bildes (per Teleport im
  // <body>) -- bewusst KEIN Vollbild-Overlay, damit weder der globale Footer
  // verdeckt noch das Scrollen der Seite blockiert wird.
  const {
    open: imageLinkOpen,
    anchorEl: imageLinkAnchor,
    menuEl: imageLinkMenu,
    style: imageLinkStyle,
    openMenu: openImageLinkMenu,
    close: closeImageLinkMenu,
  } = useAnchoredMenu(260)
  // Welches Bild wird gerade verlinkt (null = zu) und der Eingabewert.
  const imageLinkId = ref<string | null>(null)
  const imageLinkUrl = ref('')
  const imageLinkInput = ref<HTMLInputElement | null>(null)

  /** Oeffnet den Link-Editor fuer ein Bild (vorbelegt mit dem aktuellen Ziel). */
  function openImageLink(img: ImagePlacement, e: Event): void {
    selectImage(img.id)
    // Popover an der angeklickten Schaltflaeche verankern.
    imageLinkAnchor.value = e.currentTarget as HTMLElement
    imageLinkId.value = img.id
    imageLinkUrl.value = img.href ?? ''
    openImageLinkMenu()
    nextTick(() => {
      imageLinkInput.value?.focus()
      imageLinkInput.value?.select()
    })
  }

  function closeImageLink(): void {
    closeImageLinkMenu()
    imageLinkId.value = null
  }

  /**
   * Uebernimmt das Link-Ziel des Bildes. Die URL wird normalisiert (fehlendes
   * Schema ergaenzt) und auf ein sicheres Schema geprueft; ein leerer/ungueltiger
   * Wert entfernt den Link. Als EINE Undo-Stufe (begin/commitImageChange).
   */
  function applyImageLink(): void {
    const id = imageLinkId.value
    if (!id) return
    const href = sanitizeUrl(normalizeUrl(imageLinkUrl.value))
    store.beginImageChange()
    store.updateImage(id, { href })
    store.commitImageChange()
    closeImageLink()
  }

  function removeImageLink(): void {
    imageLinkUrl.value = ''
    applyImageLink()
  }

  /** Ziehen zum Verschieben. Bildschirm-Delta wird durch den Zoom geteilt. */
  function startDrag(img: ImagePlacement, e: PointerEvent): void {
    selectImage(img.id)
    const m = metrics.value
    if (!m) return
    // Ganze Ziehbewegung = eine Undo-Stufe.
    store.beginImageChange()
    const z = zoom.value
    const startX = e.clientX
    const startY = e.clientY
    const ox = img.x
    const oy = img.y
    const move = (ev: PointerEvent): void => {
      const nx = clamp(ox + (ev.clientX - startX) / z, 0, m.contentW - img.w)
      const ny = Math.max(0, oy + (ev.clientY - startY) / z)
      store.updateImage(img.id, { x: Math.round(nx), y: Math.round(ny) })
      nextTick(measure)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      store.commitImageChange()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Ziehen an der Ecke zum Skalieren (Seitenverhaeltnis bleibt erhalten). */
  function startResize(img: ImagePlacement, e: PointerEvent): void {
    selectImage(img.id)
    const m = metrics.value
    if (!m) return
    // Ganze Skalier-Bewegung = eine Undo-Stufe.
    store.beginImageChange()
    const z = zoom.value
    const startX = e.clientX
    const ow = img.w
    const aspect = img.w / img.h
    const move = (ev: PointerEvent): void => {
      const nw = clamp(ow + (ev.clientX - startX) / z, MIN_IMAGE, m.contentW - img.x)
      store.updateImage(img.id, { w: Math.round(nw), h: Math.max(1, Math.round(nw / aspect)) })
      nextTick(measure)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      store.commitImageChange()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  /** Entf/Backspace loescht das gewaehlte Bild -- nur, wenn nicht im Text getippt wird. */
  function onImageKeydown(e: KeyboardEvent): void {
    if (!selectedImageId.value) return
    if (document.activeElement === editable.value) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      deleteImage(selectedImageId.value)
    }
  }
  onMounted(() => document.addEventListener('keydown', onImageKeydown))
  onBeforeUnmount(() => document.removeEventListener('keydown', onImageKeydown))

  return {
    selectedImageId,
    imageStyle,
    insertImageFile,
    selectImage,
    deleteImage,
    startDrag,
    startResize,
    imageLinkOpen,
    imageLinkMenu,
    imageLinkStyle,
    imageLinkId,
    imageLinkUrl,
    imageLinkInput,
    openImageLink,
    closeImageLink,
    applyImageLink,
    removeImageLink,
  }
}
