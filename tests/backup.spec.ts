import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { BACKUP_APP_ID, useEditorStore } from '@/stores/editor'

beforeEach(() => {
  localStorage.clear()
  setActivePinia(createPinia())
})

/** Baut eine gueltige Sicherung mit den angegebenen Dokumenten. */
function backup(documents: unknown[]): unknown {
  return { app: BACKUP_APP_ID, type: 'backup', version: 1, exportedAt: 0, documents }
}

describe('Sicherung exportieren', () => {
  it('enthaelt Kennung, Version und alle Dokumente', () => {
    const store = useEditorStore()
    store.updateContent('Hallo Welt')
    const data = store.exportBackup()
    expect(data.app).toBe(BACKUP_APP_ID)
    expect(data.type).toBe('backup')
    expect(data.version).toBe(1)
    expect(data.documents.length).toBe(store.documents.length)
    expect(data.settings).toBeTruthy()
  })
})

describe('Sicherung wiederherstellen', () => {
  it('fuegt Dokumente hinzu (nicht ersetzen) und aktiviert das erste', () => {
    const store = useEditorStore()
    const before = store.documents.length
    const n = store.importBackup(
      backup([
        { name: 'Doc A', content: 'Erstes' },
        { name: 'Doc B', content: 'Zweites' },
      ]),
    )
    expect(n).toBe(2)
    expect(store.documents.length).toBe(before + 2)
    expect(store.activeTitle).toBe('Doc A')
    // Neue IDs -- keine Kollision mit evtl. mitgelieferten IDs.
    expect(new Set(store.documents.map((d) => d.id)).size).toBe(store.documents.length)
  })

  it('lehnt ungueltige Dateien ab (0 importiert)', () => {
    const store = useEditorStore()
    expect(store.importBackup(null)).toBe(0)
    expect(store.importBackup({})).toBe(0)
    expect(store.importBackup({ app: 'etwas-anderes', documents: [] })).toBe(0)
    expect(store.importBackup(backup([]))).toBe(0)
  })

  it('bereinigt importierten Inhalt (kein aktiver Schadcode)', () => {
    const store = useEditorStore()
    store.importBackup(backup([{ name: 'X', content: '<img src=x onerror=alert(1)><b>hi</b>' }]))
    expect(store.activeContent).not.toContain('onerror')
    expect(store.activeContent).toContain('hi')
  })

  it('behaelt nur gueltige Bild-Daten-URLs', () => {
    const store = useEditorStore()
    store.importBackup(
      backup([
        {
          name: 'IMG',
          content: 'x',
          images: [
            { src: 'data:image/png;base64,AAAA', x: 1, y: 2, w: 3, h: 4 },
            { src: 'http://example.com/x.png', x: 0, y: 0, w: 1, h: 1 },
          ],
        },
      ]),
    )
    expect(store.activeImages.length).toBe(1)
    expect(store.activeImages[0]!.src).toBe('data:image/png;base64,AAAA')
    expect(store.activeImages[0]!.id).toMatch(/^img_/)
  })
})
