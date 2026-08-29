import { computed, nextTick, onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { useEditorStore } from '@/stores/editor'
import type { BlockType, SelectionFormat } from '@/types'
import type { Transform } from '@/utils/textTransforms'
import { htmlToPlain, normalizeUrl, plainToHtml, sanitizeHtml } from '@/utils/richText'

interface RichTextOptions {
  /** contenteditable-Feld des Editors. */
  editable: Ref<HTMLElement | null>
  /** Neu-Vermessung der Inhaltshoehe (aus usePageView). */
  measure: () => void
  /** Cursor-Position (Zeile/Spalte) an die Statusleiste melden. */
  onCursor: (line: number, col: number) => void
  /** Auswahl-Format an die Format-Leiste melden. */
  onSelection: (state: SelectionFormat) => void
}

/**
 * Kern-"Engine" des Rich-Text-Editors: haelt den contenteditable-Inhalt mit dem
 * Store synchron, meldet Cursor/Auswahl nach aussen und kapselt alle
 * Auszeichnungs-Kommandos (Fett/Kursiv/Farbe, Unterstrichen/Durchgestrichen/
 * Highlight/Link/Zitat), Bloecke/Listen sowie Transformationen. Bewusst
 * getrennt von Seiten-Ansicht, Bildern und Suche, damit die Editor-Komponente
 * schlank bleibt.
 */
export function useRichText({ editable, measure, onCursor, onSelection }: RichTextOptions) {
  const store = useEditorStore()

  /**
   * Zeilenumbruch als Inline-Style (kein sinnvolles Gegenstueck als CSS-Variable).
   * Schrift/Groesse/Farbe/Ausrichtung kommen als --editor-*-Variablen von useTheme;
   * Inline-Auszeichnungen im Text ueberschreiben Gewicht/Stil/Farbe punktuell.
   */
  const editorStyle = computed(() => ({
    whiteSpace: store.settings.wordWrap ? ('pre-wrap' as const) : ('pre' as const),
  }))

  /* ---------- Inhalt <-> Store synchronisieren ---------- */
  /**
   * Schreibt den Store-Inhalt in das Feld -- aber nur bei EXTERNEN Aenderungen
   * (Dokumentwechsel, Undo/Redo, Transformation, Suchen&Ersetzen). Beim Tippen
   * setzt der Editor selbst den Store auf sein aktuelles innerHTML; dann stimmen
   * beide ueberein und es wird NICHT neu geschrieben -- so bleibt der Cursor stehen.
   */
  function renderFromStore(caretToEnd = false): void {
    const el = editable.value
    if (!el) return
    if (el.innerHTML === store.activeContent) return
    el.innerHTML = store.activeContent
    if (caretToEnd) placeCaretEnd()
    nextTick(measure)
  }

  /** Liest das Feld und schiebt es in den Store (Tippen -> debounced eine Stufe). */
  function syncFromDom(): void {
    const el = editable.value
    if (!el) return
    store.updateContent(el.innerHTML)
    measure()
    reportCursor()
    reportSelection()
  }

  // Waehrend eines eigenen Kommandos (Fett/Kursiv/Farbe/Einfuegen/Zuruecksetzen)
  // wird das vom Browser ausgeloeste input-Event unterdrueckt: solche Aktionen
  // sollen NICHT ueber den (zusammenfassenden) Tipp-Pfad laufen, sondern als eine
  // eigene, klar abgegrenzte Undo-Stufe committet werden.
  let suppressInput = false

  function onInput(): void {
    if (suppressInput) return
    syncFromDom()
  }

  /** Schreibt den aktuellen Feldinhalt als EINE eigene Undo-Stufe fest. */
  function commitDiscrete(): void {
    const el = editable.value
    if (!el) return
    store.replaceContent(el.innerHTML)
    measure()
    reportCursor()
    reportSelection()
  }

  /**
   * Fuehrt ein contenteditable-Kommando aus und macht daraus genau eine Undo-Stufe.
   * Die zuletzt gemerkte Auswahl wird vorher wiederhergestellt, damit ein Klick auf
   * die Format-Leiste (der den Fokus kurz nimmt) die Auswahl nicht verliert.
   */
  function runCommand(fn: () => void): void {
    const el = editable.value
    if (!el) return
    el.focus()
    restoreSelection()
    ensureCssStyling()
    suppressInput = true
    try {
      fn()
    } finally {
      suppressInput = false
    }
    commitDiscrete()
  }

  function placeCaretEnd(): void {
    const el = editable.value
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }

  /* ---------- Cursor-Position (Zeile/Spalte) ---------- */
  function reportCursor(): void {
    const el = editable.value
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) return
    const pre = document.createRange()
    pre.selectNodeContents(el)
    pre.setEnd(range.startContainer, range.startOffset)
    const holder = document.createElement('div')
    holder.appendChild(pre.cloneContents())
    const before = htmlToPlain(holder.innerHTML)
    const line = before.split('\n').length
    const col = before.length - before.lastIndexOf('\n')
    onCursor(line, col)
  }

  /* ---------- Auswahl-Format an die Format-Leiste melden ---------- */
  function reportSelection(): void {
    const el = editable.value
    const sel = window.getSelection()
    let inside = false
    let collapsed = true
    if (el && sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      inside = el.contains(range.commonAncestorContainer)
      collapsed = sel.isCollapsed
    }
    let bold = false
    let italic = false
    let underline = false
    let strikethrough = false
    let highlight = false
    let link = false
    let linkHref = ''
    let quote = false
    let allSelected = false
    let bulletList = false
    let numberedList = false
    let block: BlockType = 'p'
    if (inside) {
      try {
        bold = document.queryCommandState('bold')
        italic = document.queryCommandState('italic')
        underline = document.queryCommandState('underline')
        strikethrough = document.queryCommandState('strikeThrough')
        bulletList = document.queryCommandState('insertUnorderedList')
        numberedList = document.queryCommandState('insertOrderedList')
      } catch {
        /* queryCommandState evtl. nicht verfuegbar */
      }
      highlight = ancestorTag(['MARK']) !== null
      const anchor = ancestorTag(['A']) as HTMLAnchorElement | null
      link = anchor !== null
      linkHref = anchor?.getAttribute('href') ?? ''
      quote = ancestorTag(['BLOCKQUOTE']) !== null
      block = currentBlock()
      if (el && sel && !collapsed) {
        const full = document.createRange()
        full.selectNodeContents(el)
        const r = sel.getRangeAt(0)
        allSelected =
          r.compareBoundaryPoints(Range.START_TO_START, full) <= 0 &&
          r.compareBoundaryPoints(Range.END_TO_END, full) >= 0
      }
    }
    onSelection({
      hasSelection: inside && !collapsed,
      allSelected,
      bold,
      italic,
      underline,
      strikethrough,
      highlight,
      link,
      linkHref,
      color: '',
      block,
      quote,
      bulletList,
      numberedList,
    })
  }

  /**
   * Sucht vom Anfang der aktuellen Auswahl aus nach oben das naechste Element mit
   * einem der angegebenen Tags (innerhalb des Feldes). Fuer die Zustaende der
   * Format-Leiste (Highlight/Link/Zitat), die queryCommandState nicht kennt.
   */
  function ancestorTag(tags: string[]): HTMLElement | null {
    const el = editable.value
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return null
    let node: Node | null = sel.getRangeAt(0).startContainer
    while (node && node !== el) {
      if (node.nodeType === Node.ELEMENT_NODE && tags.includes((node as HTMLElement).tagName)) {
        return node as HTMLElement
      }
      node = node.parentNode
    }
    return null
  }

  // Letzte echte (nicht leere) Auswahl im Feld -- damit ein Klick auf einen
  // Format-Knopf (der das Feld kurz den Fokus verlieren laesst) die Auswahl nicht
  // verliert.
  let savedRange: Range | null = null

  function onSelectionChange(): void {
    // Nur reagieren, wenn die Auswahl in unserem Feld liegt.
    const el = editable.value
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return
    const range = sel.getRangeAt(0)
    if (!el.contains(range.commonAncestorContainer)) return
    // Eine echte Auswahl merken; ein bewusst IM Feld gesetzter Cursor (kollabiert)
    // verwirft die alte Auswahl -- sonst wuerde ein spaeterer Befehl (z. B. Absatz/
    // Ueberschrift ueber das Auswahlfeld) faelschlich auf die alte, laengst
    // ueberholte Markierung wirken. Ein Klick auf ein Leisten-Control laesst die
    // Auswahl das Feld verlassen -> onSelectionChange greift hier gar nicht.
    savedRange = sel.isCollapsed ? null : range.cloneRange()
    reportSelection()
    reportCursor()
  }

  /** Stellt die zuletzt gemerkte Auswahl wieder her, falls der Fokus/die Auswahl
   *  beim Klick auf die Leiste verloren ging. */
  function restoreSelection(): void {
    const el = editable.value
    const sel = window.getSelection()
    if (!el || !sel) return
    const valid =
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      el.contains(sel.getRangeAt(0).commonAncestorContainer)
    if (valid || !savedRange) return
    sel.removeAllRanges()
    sel.addRange(savedRange)
  }

  /* ---------- Tastatur / Einfuegen ---------- */
  function onTab(e: KeyboardEvent): void {
    e.preventDefault()
    insertText('  ')
  }

  function insertText(text: string): void {
    editable.value?.focus()
    document.execCommand('insertText', false, text)
    syncFromDom()
  }

  /**
   * Fuegt (bereinigtes) HTML an der Cursorposition ein -- eine eigene Undo-Stufe.
   * Genutzt vom "Einfuegen"-Knopf, damit formatierter Zwischenablage-Inhalt seine
   * Auszeichnung behaelt (wie beim normalen Einfuegen ueber onPaste).
   */
  function insertHtml(html: string): void {
    runCommand(() => document.execCommand('insertHTML', false, sanitizeHtml(html)))
  }

  function onPaste(e: ClipboardEvent): void {
    e.preventDefault()
    const data = e.clipboardData
    if (!data) return
    const html = data.getData('text/html')
    runCommand(() => {
      if (html) document.execCommand('insertHTML', false, sanitizeHtml(html))
      else document.execCommand('insertText', false, data.getData('text/plain'))
    })
  }

  /* ---------- Inline-Formatierung (Fett/Kursiv/Farbe) ---------- */
  function ensureCssStyling(): void {
    // Farbe/Gewicht/Stil als CSS-Style (span) statt <font>-Tags erzeugen.
    try {
      document.execCommand('styleWithCSS', false, 'true')
    } catch {
      /* aeltere Engines ignorieren das */
    }
  }

  function toggleBold(): void {
    runCommand(() => document.execCommand('bold'))
  }

  function toggleItalic(): void {
    runCommand(() => document.execCommand('italic'))
  }

  function applyColor(color: string): void {
    const el = editable.value
    if (!el) return
    // Leere Farbe ("Automatisch"): auf die aktuelle Standard-Textfarbe setzen.
    const value = color || rgbToHex(getComputedStyle(el).color) || '#111827'
    runCommand(() => document.execCommand('foreColor', false, value))
  }

  /* ---------- Erweiterte Auszeichnung (Unterstrichen/Durchgestrichen/Highlight/Link/Zitat) ---------- */

  /**
   * Unterstrichen bzw. durchgestrichen bewusst OHNE styleWithCSS: so erzeugt der
   * Browser die Tags <u>/<strike> (bzw. <s>) statt eines <span
   * style="text-decoration">. Der Style wuerde von der Bereinigung entfernt (die
   * Style-Allowlist kennt nur Farbe/Gewicht/Stil) -- die Tags bleiben dagegen
   * erhalten und werden auch sauber zu Markdown.
   */
  function toggleUnderline(): void {
    runCommand(() => {
      try {
        document.execCommand('styleWithCSS', false, 'false')
      } catch {
        /* aeltere Engines ignorieren das */
      }
      document.execCommand('underline')
    })
  }

  function toggleStrikethrough(): void {
    runCommand(() => {
      try {
        document.execCommand('styleWithCSS', false, 'false')
      } catch {
        /* aeltere Engines ignorieren das */
      }
      document.execCommand('strikeThrough')
    })
  }

  /**
   * Highlight (<mark>) hat kein execCommand-Gegenstueck. Liegt die Auswahl bereits
   * in einer Hervorhebung, wird diese aufgehoben; sonst wird die Auswahl in ein
   * <mark> verpackt (verschachtelte <mark> werden dabei entfernt).
   */
  function toggleHighlight(): void {
    runCommand(() => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
      const existing = ancestorTag(['MARK'])
      if (existing) {
        unwrapElement(existing)
        return
      }
      const range = sel.getRangeAt(0)
      const fragment = range.extractContents()
      // Bereits enthaltene Hervorhebungen aufloesen, damit kein <mark><mark> entsteht.
      fragment.querySelectorAll('mark').forEach((m) => {
        const parent = m.parentNode
        if (!parent) return
        while (m.firstChild) parent.insertBefore(m.firstChild, m)
        parent.removeChild(m)
      })
      const mark = document.createElement('mark')
      mark.appendChild(fragment)
      range.insertNode(mark)
      const next = document.createRange()
      next.selectNodeContents(mark)
      sel.removeAllRanges()
      sel.addRange(next)
    })
  }

  /** Ersetzt ein Element durch seinen Inhalt (Highlight/Link aufheben). */
  function unwrapElement(el: HTMLElement): void {
    const parent = el.parentNode
    if (!parent) return
    const sel = window.getSelection()
    const range = document.createRange()
    range.setStartBefore(el.firstChild ?? el)
    while (el.firstChild) parent.insertBefore(el.firstChild, el)
    range.setEndBefore(el)
    parent.removeChild(el)
    if (sel) {
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  /**
   * Setzt einen Link auf die Auswahl (oder aktualisiert einen bestehenden). Ein
   * leerer/ungueltiger Wert entfernt den Link. Die Ziel-URL wird normalisiert
   * (fehlt ein Schema, wird http(s)/mailto ergaenzt).
   */
  function createLink(url: string): void {
    const value = normalizeUrl(url)
    if (!value) {
      removeLink()
      return
    }
    runCommand(() => {
      // Steht der Cursor in einem bestehenden Link, diesen zuerst markieren, damit
      // createLink die komplette Ziel-URL ersetzt (statt nur einen Teil).
      const existing = ancestorTag(['A'])
      if (existing) {
        const range = document.createRange()
        range.selectNodeContents(existing)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      document.execCommand('createLink', false, value)
    })
  }

  function removeLink(): void {
    runCommand(() => {
      const existing = ancestorTag(['A'])
      // Ohne Auswahl den ganzen Link markieren, damit unlink greift.
      if (existing) {
        const range = document.createRange()
        range.selectNodeContents(existing)
        const sel = window.getSelection()
        sel?.removeAllRanges()
        sel?.addRange(range)
      }
      document.execCommand('unlink')
    })
  }

  /**
   * Zitat (blockquote) fuer die aktuelle Zeile(n) an/aus. Steht die Auswahl bereits
   * in einem Zitat, wird es wieder in normale Zeilen (<div>) aufgeloest; sonst wird
   * die Zeile in ein blockquote verpackt. Zuvor wird sie -- wie bei Ueberschriften
   * -- aus einer eventuellen Liste geloest.
   */
  function toggleQuote(): void {
    runCommand(() => {
      if (ancestorTag(['BLOCKQUOTE'])) {
        document.execCommand('formatBlock', false, '<div>')
        return
      }
      let guard = 0
      while (selectionInList() && guard++ < 6) {
        if (!document.execCommand('outdent')) break
      }
      document.execCommand('formatBlock', false, '<blockquote>')
      normalizeRichBlocks()
    })
  }

  /**
   * Entfernt Fett/Kursiv/Farbe. Ist Text markiert, nur dort; sonst im ganzen
   * Dokument. Eine eigene Undo-Stufe.
   */
  function clearFormatting(): void {
    const el = editable.value
    if (!el) return
    el.focus()
    // Bewusst KEIN restoreSelection: eine echte Auswahl bleibt dank
    // @mousedown.prevent am Knopf erhalten; ohne Auswahl soll wirklich das ganze
    // Dokument neutralisiert werden (nicht die zuletzt gemerkte Auswahl).
    const sel = window.getSelection()
    const hadSelection = !!(
      sel &&
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      el.contains(sel.getRangeAt(0).commonAncestorContainer)
    )
    ensureCssStyling()
    suppressInput = true
    try {
      if (!hadSelection && sel) {
        const range = document.createRange()
        range.selectNodeContents(el)
        sel.removeAllRanges()
        sel.addRange(range)
      }
      // removeFormat entfernt Fett/Kursiv/Farbe/Unterstrichen/Durchgestrichen,
      // aber weder Links noch Highlights -- diese daher zusaetzlich aufloesen.
      document.execCommand('removeFormat')
      document.execCommand('unlink')
      const activeRange = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null
      el.querySelectorAll('mark').forEach((m) => {
        if (activeRange && !activeRange.intersectsNode(m)) return
        const parent = m.parentNode
        if (!parent) return
        while (m.firstChild) parent.insertBefore(m.firstChild, m)
        parent.removeChild(m)
      })
    } finally {
      suppressInput = false
    }
    if (!hadSelection) window.getSelection()?.removeAllRanges()
    commitDiscrete()
  }

  /* ---------- Bloecke (Ueberschriften) und Listen ---------- */
  /**
   * Raeumt ungueltige Verschachtelung von Ueberschrift und Liste auf. Der Browser
   * verpackt beim Kombinieren (z. B. "alles markieren -> Liste, dann Ueberschrift")
   * die Liste gern IN eine Ueberschrift (`<h1><ol>...</ol></h1>`) -- dann erben die
   * Eintraege die H1-Groesse und der Markdown-Export verliert die Liste.
   * Ueberschrift + Liste ist kein sinnvoller Block: die Liste gewinnt.
   */
  function normalizeRichBlocks(): void {
    const el = editable.value
    if (!el) return
    // Liste in Ueberschrift -> Ueberschrift aufloesen (Inhalt inkl. Liste bleibt).
    el.querySelectorAll('h1, h2, h3').forEach((h) => {
      if (!h.querySelector('ul, ol')) return
      const parent = h.parentNode
      if (!parent) return
      while (h.firstChild) parent.insertBefore(h.firstChild, h)
      parent.removeChild(h)
    })
    // Ueberschrift in einem Listeneintrag -> entfernen (Text bleibt).
    el.querySelectorAll('li h1, li h2, li h3').forEach((h) => {
      const parent = h.parentNode
      if (!parent) return
      while (h.firstChild) parent.insertBefore(h.firstChild, h)
      parent.removeChild(h)
    })
    // Benachbarte gleichartige Listen zusammenfuehren (execCommand splittet oft).
    el.querySelectorAll('ul, ol').forEach((list) => {
      let next = list.nextElementSibling
      while (next && next.tagName === list.tagName) {
        const after = next.nextElementSibling
        while (next.firstChild) list.appendChild(next.firstChild)
        next.remove()
        next = after
      }
    })
  }

  /** Liegt die aktuelle Auswahl in einer Liste (li/ul/ol)? */
  function selectionInList(): boolean {
    const el = editable.value
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return false
    let node: Node | null = sel.getRangeAt(0).startContainer
    while (node && node !== el) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName
        if (tag === 'LI' || tag === 'UL' || tag === 'OL') return true
      }
      node = node.parentNode
    }
    return false
  }

  /**
   * Setzt den Blocktyp der aktuellen Zeile(n). 'p' = normale Zeile (wieder ein
   * <div>, wie der Editor sie sonst nutzt). Eine eigene Undo-Stufe.
   *
   * Steht die Zeile in einer Liste, wird sie zuerst per `outdent` aus der Liste
   * geloest -- so wird die Ueberschrift (bzw. der Absatz) NICHT Teil der Liste,
   * sondern steht davor/dahinter. (Ohne dies verpackt der Browser die Liste in die
   * Ueberschrift; hier "gewinnt" bewusst die Ueberschrift, beim Listen-Knopf die
   * Liste.)
   */
  function setBlock(block: BlockType): void {
    runCommand(() => {
      let guard = 0
      while (selectionInList() && guard++ < 6) {
        if (!document.execCommand('outdent')) break
      }
      // Bracket-Form ('<h1>') ist die breit kompatible Schreibweise fuer
      // formatBlock. Normal -> <div> (der Editor arbeitet mit <div>-Zeilen).
      document.execCommand('formatBlock', false, block === 'p' ? '<div>' : `<${block}>`)
      normalizeRichBlocks()
    })
  }

  function toggleBulletList(): void {
    runCommand(() => {
      document.execCommand('insertUnorderedList')
      normalizeRichBlocks()
    })
  }

  function toggleNumberedList(): void {
    runCommand(() => {
      document.execCommand('insertOrderedList')
      normalizeRichBlocks()
    })
  }

  /** Blocktyp an der aktuellen Cursorposition (fuer die Format-Leiste). */
  function currentBlock(): BlockType {
    const el = editable.value
    const sel = window.getSelection()
    if (!el || !sel || sel.rangeCount === 0) return 'p'
    let node: Node | null = sel.getRangeAt(0).startContainer
    while (node && node !== el) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = (node as HTMLElement).tagName
        if (tag === 'H1') return 'h1'
        if (tag === 'H2') return 'h2'
        if (tag === 'H3') return 'h3'
      }
      node = node.parentNode
    }
    return 'p'
  }

  function rgbToHex(rgb: string): string {
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    if (!m) return ''
    const hex = (n: string): string => Number(n).toString(16).padStart(2, '0')
    return `#${hex(m[1]!)}${hex(m[2]!)}${hex(m[3]!)}`
  }

  /* ---------- Transformationen (Auswahl oder ganzer Text) ---------- */
  function applyTransform(fn: Transform): void {
    const el = editable.value
    const sel = window.getSelection()
    const hasSel =
      el &&
      sel &&
      sel.rangeCount > 0 &&
      !sel.isCollapsed &&
      el.contains(sel.getRangeAt(0).commonAncestorContainer)
    if (hasSel) {
      // Auswahl: transformierten reinen Text einsetzen (Auszeichnung der Auswahl
      // geht dabei verloren -- Transformationen sind Text-Operationen).
      const replacement = fn(sel!.toString())
      runCommand(() => document.execCommand('insertText', false, replacement))
    } else {
      // Ganzer Text: auf reinen Text anwenden (formatiert danach neutral).
      store.replaceContent(plainToHtml(fn(store.activePlain)))
    }
  }

  function focusEditor(): void {
    editable.value?.focus()
  }

  /* ---------- Alles markieren / Auswahl aufheben ---------- */
  function selectAll(): void {
    const el = editable.value
    if (!el) return
    el.focus()
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    if (!sel?.isCollapsed) savedRange = range.cloneRange()
    reportSelection()
    reportCursor()
  }

  function deselect(): void {
    const sel = window.getSelection()
    sel?.removeAllRanges()
    // Gemerkte Auswahl verwerfen, damit ein spaeteres Format-Kommando sie nicht
    // wiederherstellt.
    savedRange = null
    reportSelection()
  }

  /* ---------- Lebenszyklus ---------- */
  onMounted(() => {
    store.normalizeActiveToHtml()
    if (editable.value) editable.value.innerHTML = store.activeContent
    nextTick(measure)
    document.addEventListener('selectionchange', onSelectionChange)
  })
  onBeforeUnmount(() => {
    document.removeEventListener('selectionchange', onSelectionChange)
  })

  // Dokumentwechsel: Inhalt neu einsetzen (in HTML normalisiert).
  watch(
    () => store.activeId,
    () => {
      store.normalizeActiveToHtml()
      nextTick(() => renderFromStore(false))
    },
  )
  // Externe Inhaltsaenderung (Undo/Redo/Transform/Ersetzen): Feld nachziehen.
  watch(
    () => store.activeContent,
    () => renderFromStore(true),
  )

  return {
    editorStyle,
    onInput,
    onTab,
    onPaste,
    syncFromDom,
    reportCursor,
    reportSelection,
    focusEditor,
    applyTransform,
    insertText,
    insertHtml,
    toggleBold,
    toggleItalic,
    applyColor,
    toggleUnderline,
    toggleStrikethrough,
    toggleHighlight,
    createLink,
    removeLink,
    toggleQuote,
    clearFormatting,
    setBlock,
    toggleBulletList,
    toggleNumberedList,
    selectAll,
    deselect,
  }
}
