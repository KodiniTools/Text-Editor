import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Globales Drag & Drop fuer Dateien. Meldet abgelegte Dateien an `onFiles` und
 * liefert `active` (true, solange Dateien ueber dem Fenster schweben) fuer eine
 * Ablage-Ueberlagerung.
 *
 * Nur echte Dateien loesen aus -- Text-Auswahl oder Bild-Ziehen im Editor (kein
 * `Files`-Typ) wird ignoriert, damit das interne Verschieben von Bildern nicht
 * gestoert wird.
 */
export function useFileDrop(onFiles: (files: File[]) => void) {
  const active = ref(false)
  // Zaehler statt Boolean: dragenter/leave feuern auch beim Wechsel zwischen
  // Kindelementen -- erst bei 0 ist der Zeiger wirklich draussen.
  let depth = 0

  function hasFiles(e: DragEvent): boolean {
    const types = e.dataTransfer?.types
    return !!types && Array.from(types).includes('Files')
  }

  function onDragEnter(e: DragEvent): void {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth++
    active.value = true
  }
  function onDragOver(e: DragEvent): void {
    if (!hasFiles(e)) return
    // preventDefault ist Pflicht, sonst laesst der Browser kein Drop zu.
    e.preventDefault()
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  }
  function onDragLeave(e: DragEvent): void {
    if (!hasFiles(e)) return
    depth = Math.max(0, depth - 1)
    if (depth === 0) active.value = false
  }
  function onDrop(e: DragEvent): void {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth = 0
    active.value = false
    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length) onFiles(files)
  }

  onMounted(() => {
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDrop)
  })

  return { active }
}
