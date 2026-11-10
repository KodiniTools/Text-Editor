import { readonly, ref, type DeepReadonly, type Ref } from 'vue'
import { safeFileName } from '@/utils/exportPdf'
import {
  pickSaveTarget,
  stripExt,
  supportsSavePicker,
  type SaveExt,
  type SaveTarget,
} from '@/utils/saveFile'

/**
 * App-weiter "Speichern unter"-Dialog (Modul-Singleton wie useToast).
 *
 * Ablauf: ein Aufrufer fragt per `requestSave` nach einem Ziel und bekommt ein
 * Promise. Der Dialog (SaveDialog.vue) zeigt den Dateinamen zum Bearbeiten;
 * bei "Weiter" wird -- falls der Browser es kann -- sofort der System-Dialog
 * fuer den Speicherort geoeffnet (braucht die Nutzergeste), sonst bleibt es beim
 * Download. Das Promise liefert das Ziel oder null bei Abbruch. Erst danach
 * erzeugt der Aufrufer den Inhalt und schreibt ihn (writeSaveTarget).
 */

export interface SaveRequest {
  /** Vorgeschlagener Dateiname ohne Endung. */
  base: string
  ext: SaveExt
  /** MIME-Typ der Datei (fuer den System-Dialog). */
  type: string
}

interface PendingRequest extends SaveRequest {
  resolve: (target: SaveTarget | null) => void
}

const pending = ref<PendingRequest | null>(null)

function settle(target: SaveTarget | null): void {
  const req = pending.value
  pending.value = null
  req?.resolve(target)
}

/** Oeffnet den Dialog. Ein bereits offener Dialog wird dabei abgebrochen. */
function requestSave(req: SaveRequest): Promise<SaveTarget | null> {
  settle(null)
  return new Promise((resolve) => {
    pending.value = { ...req, resolve }
  })
}

/**
 * Bestaetigung aus dem Dialog. Rueckgabe `'cancelled'`, wenn der Nutzer den
 * System-Dialog abgebrochen hat -- der eigene Dialog bleibt dann offen.
 */
async function confirm(name: string): Promise<'done' | 'cancelled'> {
  const req = pending.value
  if (!req) return 'done'
  const base = safeFileName(stripExt(name, req.ext))
  const fileName = `${base}.${req.ext}`
  const picked = await pickSaveTarget(fileName, req.type, req.ext)
  if (picked === 'cancelled') return 'cancelled'
  // Dialog inzwischen anderweitig geschlossen (z. B. neuer Aufruf)?
  if (pending.value !== req) return 'done'
  settle(picked === 'unsupported' ? { fileName, handle: null } : picked)
  return 'done'
}

function cancel(): void {
  settle(null)
}

export function useSaveDialog(): {
  pending: DeepReadonly<Ref<PendingRequest | null>>
  canPickLocation: boolean
  requestSave: typeof requestSave
  confirm: typeof confirm
  cancel: typeof cancel
} {
  return {
    pending: readonly(pending) as DeepReadonly<Ref<PendingRequest | null>>,
    canPickLocation: supportsSavePicker(),
    requestSave,
    confirm,
    cancel,
  }
}

/** Nur fuer Tests: offenen Dialog verwerfen. */
export function _resetSaveDialogForTests(): void {
  settle(null)
}
