import { describe, expect, it, vi } from 'vitest'
import {
  blobToFile,
  canShare,
  canShareFiles,
  shareFile,
  shareText,
  textToFile,
  type ShareNavigator,
} from '@/utils/share'

/** navigator-Ersatz mit steuerbarem share/canShare. */
function nav(opts: {
  share?: (data?: ShareData) => Promise<void>
  canShare?: (data?: ShareData) => boolean
}): ShareNavigator {
  return opts as unknown as ShareNavigator
}

function err(name: string): Error {
  const e = new Error(name)
  e.name = name
  return e
}

describe('share: Dateien bauen', () => {
  it('textToFile setzt Name und MIME-Typ', () => {
    const f = textToFile('hallo', 'doc.txt', 'text/plain')
    expect(f.name).toBe('doc.txt')
    expect(f.type).toBe('text/plain')
    expect(f.size).toBe(5)
  })

  it('blobToFile uebernimmt den Blob-Typ als Default', () => {
    const f = blobToFile(new Blob(['%PDF'], { type: 'application/pdf' }), 'doc.pdf')
    expect(f.type).toBe('application/pdf')
    expect(blobToFile(new Blob(['x']), 'a.bin', 'application/octet-stream').type).toBe(
      'application/octet-stream',
    )
  })
})

describe('share: Unterstuetzung erkennen', () => {
  const file = textToFile('x', 'a.txt', 'text/plain')

  it('ohne navigator.share ist nichts teilbar', () => {
    expect(canShare(undefined)).toBe(false)
    expect(canShare(nav({}))).toBe(false)
    expect(canShareFiles([file], nav({}))).toBe(false)
  })

  it('fragt canShare nach Dateien, wenn vorhanden', () => {
    const canShareFn = vi.fn(() => false)
    expect(canShareFiles([file], nav({ share: vi.fn(), canShare: canShareFn }))).toBe(false)
    expect(canShareFn).toHaveBeenCalledWith({ files: [file] })
    expect(canShareFiles([file], nav({ share: vi.fn(), canShare: () => true }))).toBe(true)
  })

  it('ohne canShare optimistisch true, ohne Dateien false', () => {
    expect(canShareFiles([file], nav({ share: vi.fn() }))).toBe(true)
    expect(canShareFiles([], nav({ share: vi.fn(), canShare: () => true }))).toBe(false)
  })
})

describe('shareFile', () => {
  const file = textToFile('x', 'a.txt', 'text/plain')

  it('teilt die Datei mit Titel', async () => {
    const share = vi.fn(async () => {})
    expect(await shareFile(file, 'Titel', nav({ share, canShare: () => true }))).toBe('shared')
    expect(share).toHaveBeenCalledWith({ files: [file], title: 'Titel' })
  })

  it('meldet unsupported, wenn Dateien nicht teilbar sind (ohne share-Aufruf)', async () => {
    const share = vi.fn(async () => {})
    expect(await shareFile(file, 'T', nav({ share, canShare: () => false }))).toBe('unsupported')
    expect(share).not.toHaveBeenCalled()
    expect(await shareFile(file, 'T', undefined)).toBe('unsupported')
  })

  it('ordnet Fehler zu: Abbruch, nicht unterstuetzt, sonstiges', async () => {
    const withError = (e: unknown) => nav({ share: async () => Promise.reject(e) })
    expect(await shareFile(file, 'T', withError(err('AbortError')))).toBe('cancelled')
    expect(await shareFile(file, 'T', withError(err('TypeError')))).toBe('unsupported')
    expect(await shareFile(file, 'T', withError(err('NotSupportedError')))).toBe('unsupported')
    expect(await shareFile(file, 'T', withError(err('NotAllowedError')))).toBe('failed')
    expect(await shareFile(file, 'T', withError('kaputt'))).toBe('failed')
  })
})

describe('shareText', () => {
  it('teilt reinen Text ohne Datei', async () => {
    const share = vi.fn(async () => {})
    expect(await shareText('Inhalt', 'T', nav({ share }))).toBe('shared')
    expect(share).toHaveBeenCalledWith({ text: 'Inhalt', title: 'T' })
  })

  it('ohne share() unsupported, bei Abbruch cancelled', async () => {
    expect(await shareText('x', 'T', nav({}))).toBe('unsupported')
    const aborting = nav({ share: async () => Promise.reject(err('AbortError')) })
    expect(await shareText('x', 'T', aborting)).toBe('cancelled')
  })
})
