import { describe, expect, it } from 'vitest'
import { isBackupFile, isHtmlFile, isImageFile, isTextFile } from '@/utils/files'

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

  it('erkennt HTML-Dateien', () => {
    expect(isHtmlFile(file('seite.html'))).toBe(true)
    expect(isHtmlFile(file('seite.htm'))).toBe(true)
    expect(isHtmlFile(file('x', 'text/html'))).toBe(true)
    expect(isHtmlFile(file('a.txt', 'text/plain'))).toBe(false)
  })

  it('behandelt HTML nicht als reine Textdatei (eigener HTML-Pfad)', () => {
    // Sonst wuerde HTML als maskierter Quelltext geoeffnet statt gerendert.
    expect(isTextFile(file('seite.html'))).toBe(false)
    expect(isTextFile(file('x', 'text/html'))).toBe(false)
  })

  it('erkennt Bilder', () => {
    expect(isImageFile(file('a.png', 'image/png'))).toBe(true)
    expect(isImageFile(file('a.txt', 'text/plain'))).toBe(false)
  })
})
