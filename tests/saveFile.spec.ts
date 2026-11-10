import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as files from '@/utils/files'
import { readFileAsText } from '@/utils/files'
import {
  baseMime,
  pickSaveTarget,
  stripExt,
  supportsSavePicker,
  writeSaveTarget,
  type SaveFileHandle,
  type SavePickerWindow,
} from '@/utils/saveFile'

/** Datei-Handle-Ersatz, der das Geschriebene festhaelt. */
function fakeHandle() {
  const written: Blob[] = []
  const close = vi.fn(async () => {})
  const handle: SaveFileHandle = {
    createWritable: async () => ({
      write: async (data: Blob | string) => {
        written.push(data instanceof Blob ? data : new Blob([data]))
      },
      close,
    }),
  }
  return { handle, written, close }
}

beforeEach(() => {
  vi.spyOn(files, 'downloadBlob').mockImplementation(() => {})
})

describe('supportsSavePicker', () => {
  it('erkennt die File System Access API nur im sicheren Kontext', () => {
    expect(supportsSavePicker({ showSaveFilePicker: async () => fakeHandle().handle })).toBe(true)
    expect(
      supportsSavePicker({
        showSaveFilePicker: async () => fakeHandle().handle,
        isSecureContext: false,
      }),
    ).toBe(false)
    expect(supportsSavePicker({})).toBe(false)
    expect(supportsSavePicker(undefined)).toBe(false)
  })
})

describe('Dateinamen-Helfer', () => {
  it('baseMime entfernt Parameter', () => {
    expect(baseMime('text/plain;charset=utf-8')).toBe('text/plain')
    expect(baseMime('application/pdf')).toBe('application/pdf')
  })

  it('stripExt entfernt nur die erwartete Endung', () => {
    expect(stripExt(' notiz.txt ', 'txt')).toBe('notiz')
    expect(stripExt('notiz.TXT', 'txt')).toBe('notiz')
    expect(stripExt('notiz.md', 'txt')).toBe('notiz.md')
    expect(stripExt('v1.2', 'txt')).toBe('v1.2')
  })
})

describe('pickSaveTarget', () => {
  it('liefert unsupported ohne API', async () => {
    expect(await pickSaveTarget('a.txt', 'text/plain', 'txt', {})).toBe('unsupported')
  })

  it('uebergibt Namen und Typ an den System-Dialog', async () => {
    const { handle } = fakeHandle()
    const showSaveFilePicker = vi.fn(async () => handle)
    const win: SavePickerWindow = { showSaveFilePicker }
    const target = await pickSaveTarget('notiz.txt', 'text/plain;charset=utf-8', 'txt', win)
    expect(target).toEqual({ fileName: 'notiz.txt', handle })
    expect(showSaveFilePicker).toHaveBeenCalledWith({
      suggestedName: 'notiz.txt',
      types: [{ accept: { 'text/plain': ['.txt'] } }],
    })
  })

  it('meldet cancelled bei AbortError und unsupported bei anderen Fehlern', async () => {
    const abort = Object.assign(new Error('abgebrochen'), { name: 'AbortError' })
    expect(
      await pickSaveTarget('a.txt', 'text/plain', 'txt', {
        showSaveFilePicker: async () => {
          throw abort
        },
      }),
    ).toBe('cancelled')
    expect(
      await pickSaveTarget('a.txt', 'text/plain', 'txt', {
        showSaveFilePicker: async () => {
          throw Object.assign(new Error('iframe'), { name: 'SecurityError' })
        },
      }),
    ).toBe('unsupported')
  })
})

describe('writeSaveTarget', () => {
  it('schreibt in das Handle und schliesst den Stream', async () => {
    const { handle, written, close } = fakeHandle()
    const result = await writeSaveTarget({ fileName: 'a.txt', handle }, 'Hallo', 'text/plain')
    expect(result).toBe('written')
    expect(written).toHaveLength(1)
    expect(await readFileAsText(written[0] as File)).toBe('Hallo')
    expect(close).toHaveBeenCalledOnce()
    expect(files.downloadBlob).not.toHaveBeenCalled()
  })

  it('laedt ohne Handle klassisch herunter', async () => {
    const result = await writeSaveTarget(
      { fileName: 'a.md', handle: null },
      '# Hi',
      'text/markdown',
    )
    expect(result).toBe('downloaded')
    expect(files.downloadBlob).toHaveBeenCalledWith('# Hi', 'a.md', 'text/markdown')
  })

  it('schliesst den Stream auch bei Schreibfehlern und reicht den Fehler weiter', async () => {
    const close = vi.fn(async () => {})
    const handle: SaveFileHandle = {
      createWritable: async () => ({
        write: async () => {
          throw new Error('voll')
        },
        close,
      }),
    }
    await expect(writeSaveTarget({ fileName: 'a.txt', handle }, 'x', 'text/plain')).rejects.toThrow(
      'voll',
    )
    expect(close).toHaveBeenCalledOnce()
  })
})
