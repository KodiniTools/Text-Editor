import { readonly, ref, type DeepReadonly, type Ref } from 'vue'

/**
 * Einfaches, app-weites Toast-System.
 *
 * Ein Modul-Singleton haelt die aktiven Meldungen; jede Komponente kann ueber
 * useToast().showToast(...) eine Meldung ausloesen. Jede Meldung mit `key` bietet
 * dem Nutzer "Nicht mehr anzeigen" -- die Auswahl wird pro Schluessel im
 * localStorage gemerkt, sodass diese Art Meldung kuenftig unterdrueckt bleibt.
 * Fehlermeldungen bekommen keinen key und lassen sich nicht dauerhaft
 * ausblenden -- sie sollen sichtbar bleiben.
 */

export type ToastType = 'success' | 'info' | 'error'

export interface Toast {
  id: number
  message: string
  type: ToastType
  /** Vorhanden -> "Nicht mehr anzeigen" verfuegbar; unterdrueckbar per key. */
  key?: string
  /** Anzeigedauer in ms (0 = kein automatisches Ausblenden). */
  duration: number
}

export interface ToastOptions {
  type?: ToastType
  key?: string
  duration?: number
}

const STORAGE_MUTED = 'kodini-editor-muted-toasts-v1'
const DEFAULT_DURATION = 4000

const toasts = ref<Toast[]>([])
const muted = ref<Set<string>>(loadMuted())
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let seq = 0

function loadMuted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_MUTED)
    if (raw) {
      const arr: unknown = JSON.parse(raw)
      if (Array.isArray(arr)) return new Set(arr.filter((x): x is string => typeof x === 'string'))
    }
  } catch {
    /* localStorage evtl. blockiert / kaputte Daten */
  }
  return new Set()
}

function persistMuted(): void {
  try {
    localStorage.setItem(STORAGE_MUTED, JSON.stringify([...muted.value]))
  } catch {
    /* ignore */
  }
}

function dismiss(id: number): void {
  toasts.value = toasts.value.filter((t) => t.id !== id)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function arm(id: number, duration: number): void {
  if (duration <= 0 || timers.has(id)) return
  timers.set(
    id,
    setTimeout(() => dismiss(id), duration),
  )
}

/** Pausiert das automatische Ausblenden (z. B. beim Ueberfahren mit der Maus). */
function pause(id: number): void {
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

/** Setzt das automatische Ausblenden nach dem Pausieren fort. */
function resume(id: number): void {
  const toast = toasts.value.find((t) => t.id === id)
  if (toast) arm(id, toast.duration)
}

/**
 * Zeigt eine Meldung. Ist ihr `key` dauerhaft ausgeblendet, passiert nichts
 * (Rueckgabe null). Sonst wird die Meldung ergaenzt und ihre ID zurueckgegeben.
 */
function showToast(message: string, opts: ToastOptions = {}): number | null {
  const { type = 'success', key, duration = DEFAULT_DURATION } = opts
  if (key && muted.value.has(key)) return null
  const id = ++seq
  toasts.value = [...toasts.value, { id, message, type, key, duration }]
  arm(id, duration)
  return id
}

/** Blendet diese Art Meldung dauerhaft aus und entfernt offene Vertreter. */
function muteKey(key: string): void {
  if (!key) return
  muted.value = new Set(muted.value).add(key)
  persistMuted()
  toasts.value.filter((t) => t.key === key).forEach((t) => dismiss(t.id))
}

function isMuted(key: string): boolean {
  return muted.value.has(key)
}

export function useToast(): {
  toasts: DeepReadonly<Ref<Toast[]>>
  showToast: typeof showToast
  dismiss: typeof dismiss
  muteKey: typeof muteKey
  isMuted: typeof isMuted
  pause: typeof pause
  resume: typeof resume
} {
  return {
    toasts: readonly(toasts) as DeepReadonly<Ref<Toast[]>>,
    showToast,
    dismiss,
    muteKey,
    isMuted,
    pause,
    resume,
  }
}

/** Nur fuer Tests: setzt Meldungen und Stummschaltungen zurueck. */
export function _resetToastsForTests(): void {
  timers.forEach((timer) => clearTimeout(timer))
  timers.clear()
  toasts.value = []
  muted.value = new Set()
  seq = 0
}
