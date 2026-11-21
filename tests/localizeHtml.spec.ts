// @vitest-environment node
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { escapeHtml, localizeHtml } from '@/utils/localizeHtml'
import { MESSAGES } from '@/i18n/messages'
import { DE_PAGES, EN_PAGES, SITE_URL } from '@/utils/enPages'

// Prüft die englische Sprachfassung, die der Build als dist/index.en.html schreibt
// (nginx liefert sie für ?lang=en aus), gegen die echte index.html.
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const DE = MESSAGES.de.landing.meta.start
const EN = MESSAGES.en.landing.meta.start
const DE_URL = 'https://kodinitools.com/texteditor/'
const EN_URL = `${DE_URL}?lang=en`

const unescape = (value: string) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
const pick = (source: string, pattern: RegExp) => unescape(source.match(pattern)?.[1] ?? '')
const headOf = (source: string) => source.slice(0, source.search(/<\/head>/i))
const title = (source: string) => pick(headOf(source), /<title[^>]*>([\s\S]*?)<\/title>/i)
const lang = (source: string) => pick(source, /<html\b[^>]*\slang="([^"]*)"/i)
const meta = (source: string, name: string) =>
  pick(
    headOf(source).match(
      new RegExp(`<meta\\b[^>]*\\s(?:name|property)="${name}"[^>]*>`, 'i'),
    )?.[0] ?? '',
    /\scontent="([^"]*)"/i,
  )
const canonical = (source: string) =>
  pick(headOf(source).match(/<link\b[^>]*\srel="canonical"[^>]*>/i)?.[0] ?? '', /\shref="([^"]*)"/i)
const hreflangs = (source: string) =>
  headOf(source).match(/<link\b[^>]*\shreflang="[^"]*"[^>]*>/gi) ?? []

const en = localizeHtml(html, { lang: 'en', ...EN, canonical: EN_URL })

test('englische Fassung: lang, Titel, Description und Canonical', () => {
  assert.equal(lang(en), 'en')
  assert.equal(title(en), EN.title)
  assert.equal(meta(en, 'description'), EN.description)
  assert.equal(canonical(en), EN_URL)
})

test('englische Fassung: Open Graph und Twitter folgen, soweit vorhanden', () => {
  for (const name of ['og:title', 'twitter:title']) {
    if (meta(html, name)) assert.equal(meta(en, name), EN.title)
  }
  for (const name of ['og:description', 'twitter:description']) {
    if (meta(html, name)) assert.equal(meta(en, name), EN.description)
  }
  for (const name of ['og:url', 'twitter:url']) {
    if (meta(html, name)) assert.equal(meta(en, name), EN_URL)
  }
  if (meta(html, 'og:locale')) assert.equal(meta(en, 'og:locale'), 'en_US')
})

test('hreflang, Body und SSI-Includes bleiben unverändert', () => {
  assert.equal(hreflangs(html).length, 3)
  assert.deepEqual(hreflangs(en), hreflangs(html))
  assert.equal(en.slice(en.search(/<\/head>/i)), html.slice(html.search(/<\/head>/i)))
  const includes = (source: string) => source.match(/<!--\s*#include [^>]*-->/g) ?? []
  assert.deepEqual(includes(en), includes(html))
})

test('deutscher Head der Quelldatei stimmt mit den Metadaten überein', () => {
  assert.equal(lang(html), 'de')
  assert.equal(title(html), DE.title)
  assert.equal(meta(html, 'description'), DE.description)
  assert.equal(canonical(html), DE_URL)
})

test('englische Metadaten halten die SEO-Längen ein', () => {
  assert.ok(EN.title.length <= 70, `Titel ${EN.title.length} Zeichen`)
  assert.ok(EN.description.length >= 100 && EN.description.length <= 165)
})

test('maskiert Sonderzeichen und bricht bei fehlenden oder doppelten Pflicht-Tags ab', () => {
  const minimal = (extra = '') =>
    `<!doctype html><html lang="de"><head><title>T</title>` +
    `<meta name="description" content="D"><link rel="canonical" href="${DE_URL}">${extra}` +
    `</head><body><svg><title>Icon</title></svg></body></html>`
  const head = { lang: 'en', title: 'A & "B" <C>', description: 'x > y & z', canonical: EN_URL }
  const out = localizeHtml(minimal(), head)
  assert.ok(out.includes('<title>A &amp; &quot;B&quot; &lt;C&gt;</title>'))
  assert.ok(out.includes('content="x &gt; y &amp; z"'))
  assert.ok(out.includes('<svg><title>Icon</title></svg>'))
  assert.equal(escapeHtml('$&'), '$&amp;')
  assert.throws(() => localizeHtml(minimal().replace(/<link[^>]*>/, ''), head), /canonical/)
  assert.throws(
    () => localizeHtml(minimal('<meta name="description" content="E">'), head),
    /description/,
  )
  assert.throws(() => localizeHtml('<html lang="de"><title>x</title>', head), /head/)
})

test('jede englische Seite des Builds hat eigenen Titel, Description, Canonical und hreflang', () => {
  assert.deepEqual(
    EN_PAGES.map((page) => page.file),
    ['index.en.html', 'app.en.html', 'funktionen.en.html', 'blog.en.html'],
  )
  assert.equal(SITE_URL, DE_URL)
  const titles = new Set<string>()
  for (const { file, path, metaKey } of EN_PAGES) {
    const page = MESSAGES.en.landing.meta[metaKey]
    const deUrl = `${SITE_URL}${path}`
    const url = `${deUrl}?lang=en`
    const out = localizeHtml(html, {
      lang: 'en',
      ...page,
      canonical: url,
      alternates: { de: deUrl, en: url, 'x-default': deUrl },
    })
    assert.equal(lang(out), 'en', file)
    assert.equal(title(out), page.title, file)
    assert.equal(meta(out, 'description'), page.description, file)
    assert.equal(canonical(out), url, file)
    assert.deepEqual(
      hreflangs(out).map((link) => pick(link, /\shref="([^"]*)"/i)),
      [deUrl, url, deUrl],
      file,
    )
    titles.add(page.title)
  }
  assert.equal(titles.size, EN_PAGES.length)
})

test('deutsche Unterseiten haben eigenen Titel und Canonical auf sich selbst', () => {
  assert.deepEqual(
    DE_PAGES.map((page) => page.file),
    ['funktionen.html', 'blog.html'],
  )
  for (const { file, path, metaKey } of DE_PAGES) {
    const page = MESSAGES.de.landing.meta[metaKey]
    const url = `${SITE_URL}${path}`
    const out = localizeHtml(html, {
      lang: 'de',
      ...page,
      canonical: url,
      alternates: { de: url, en: `${url}?lang=en`, 'x-default': url },
    })
    assert.equal(lang(out), 'de', file)
    assert.equal(title(out), page.title, file)
    assert.notEqual(page.title, DE.title, file)
    assert.equal(canonical(out), url, file)
    assert.equal(meta(out, 'og:url'), url, file)
  }
})

test('alternates: unbekannter hreflang-Wert bricht ab', () => {
  assert.throws(
    () => localizeHtml(html, { lang: 'en', ...EN, canonical: EN_URL, alternates: { fr: EN_URL } }),
    /hreflang="fr"/,
  )
})
