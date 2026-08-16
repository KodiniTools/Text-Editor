import { describe, expect, it } from 'vitest'
import { isBackupFile, isImageFile, isTextFile } from '@/utils/files'

/** Baut ein File-aehnliches Objekt fuer die Typ-Pruefungen. */
function file(name: string, type = ''): File {
  return { name, type } as File
}

describe('Datei-Typ-Erkennung', () => {
  it('erkennt Sicherungen (.json)', () => {
    expect(isBackupFile(file('backup.json'))).toBe(true)
    expect(isBackupFile(file('x', 'application/json'))).toBe(true)
    expect(isBackupFile(file('notizen.txt'))).toBe(false)
  })

  it('erkennt Textdateien', () => {
    expect(isTextFile(file('a.txt'))).toBe(true)
    expect(isTextFile(file('a.md'))).toBe(true)
    expect(isTextFile(file('a', 'text/plain'))).toBe(true)
    // .json ist eine Sicherung, keine normale Textdatei.
    expect(isTextFile(file('a.json'))).toBe(false)
    expect(isTextFile(file('a.png', 'image/png'))).toBe(false)
  })

  it('erkennt Bilder', () => {
    expect(isImageFile(file('a.png', 'image/png'))).toBe(true)
    expect(isImageFile(file('a.txt', 'text/plain'))).toBe(false)
  })
})
