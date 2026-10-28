import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useShareDocument } from '@/composables/useShareDocument'
import { _resetToastsForTests, useToast } from '@/composables/useToast'
import { setLocale } from '@/i18n'
import * as shareUtils from '@/utils/share'
import * as files from '@/utils/files'
import { readFileAsText } from '@/utils/files'

/**
 * Prueft die Fallback-Kette des Composables mit gemockter Share-/Download-
 * Schicht. PDF wird hier nicht gerendert (html2canvas laeuft nicht in jsdom);
 * der PDF-Pfad teilt sich den Renderer mit dem getesteten Export.
 */
vi.mock('@/utils/share', async (importOriginal) => {
  const actual = await importOriginal<typeof shareUtils>()
  return { ...actual, shareFile: vi.fn(), shareText: vi.fn() }
})

const shareFile = vi.mocked(shareUtils.shareFile)
const shareText = vi.mocked(shareUtils.shareText)

beforeEach(() => {
  setActivePinia(createPinia())
  setLocale('de')
  localStorage.clear()
  _resetToastsForTests()
  shareFile.mockReset()
  shareText.mockReset()
  vi.spyOn(files, 'downloadBlob').mockImplementation(() => {})
})

function setup(content = '<p>Hallo <b>Welt</b></p>') {
  const store = useEditorStore()
  store.openDocument('Mein Text', content)
  return { store, ...useShareDocument(), toasts: useToast().toasts }
}

describe('useShareDocument', () => {
  it('teilt .txt als Datei mit Dokumenttitel', async () => {
    const { share, toasts } = setup()
    shareFile.mockResolvedValue('shared')
    expect(await share('txt')).toBe('shared')
    const [file, title] = shareFile.mock.calls[0]!
    expect(file.name).toBe('Mein Text.txt')
    expect(file.type).toBe('text/plain')
    expect(await readFileAsText(file)).toBe('Hallo Welt')
    expect(title).toBe('Mein Text')
    expect(toasts.value[0]!.message).toBe('Dokument geteilt')
    expect(files.downloadBlob).not.toHaveBeenCalled()
  })

  it('.md nutzt den Markdown-Konverter', async () => {
    const { share } = setup()
    shareFile.mockResolvedValue('shared')
    await share('md')
    const file = shareFile.mock.calls[0]![0]
    expect(file.name).toBe('Mein Text.md')
    expect(await readFileAsText(file)).toContain('**Welt**')
  })

  it('.html ist ein eigenstaendiges Dokument, html-source der rohe Text', async () => {
    const { share } = setup()
    shareFile.mockResolvedValue('shared')
    await share('html')
    expect(await readFileAsText(shareFile.mock.calls[0]![0])).toMatch(/^<!doctype html>/)
    await share('html-source')
    expect(await readFileAsText(shareFile.mock.calls[1]![0])).toBe('Hallo Welt')
  })

  it('faellt bei txt/md auf Text-Teilen zurueck, wenn Dateien nicht gehen', async () => {
    const { share } = setup()
    shareFile.mockResolvedValue('unsupported')
    shareText.mockResolvedValue('shared')
    expect(await share('txt')).toBe('shared')
    expect(shareText).toHaveBeenCalledWith('Hallo Welt', 'Mein Text')
    expect(files.downloadBlob).not.toHaveBeenCalled()
  })

  it('laedt die Datei herunter, wenn Teilen nicht verfuegbar ist', async () => {
    const { share, toasts } = setup()
    shareFile.mockResolvedValue('unsupported')
    expect(await share('html')).toBe('unsupported')
    expect(shareText).not.toHaveBeenCalled()
    expect(files.downloadBlob).toHaveBeenCalledWith(expect.any(File), 'Mein Text.html', 'text/html')
    expect(toasts.value[0]!.message).toMatch(/heruntergeladen/)
  })

  it('bricht ohne Fallback ab, wenn der Nutzer den Dialog schliesst', async () => {
    const { share, toasts } = setup()
    shareFile.mockResolvedValue('cancelled')
    expect(await share('txt')).toBe('cancelled')
    expect(shareText).not.toHaveBeenCalled()
    expect(files.downloadBlob).not.toHaveBeenCalled()
    expect(toasts.value.length).toBe(0)
  })

  it('ohne aktives Dokument passiert nichts', async () => {
    setActivePinia(createPinia())
    const store = useEditorStore()
    store.documents.splice(0)
    const { share } = useShareDocument()
    expect(await share('txt')).toBe('error')
    expect(shareFile).not.toHaveBeenCalled()
  })
})
