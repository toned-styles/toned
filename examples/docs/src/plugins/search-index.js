// The site search index, generated from what the site renders.
//
// Plain JavaScript on purpose: `prerender.js` (run by `node`) and
// `vite.config.ts` both import this file, and neither is compiled first.
//
// Build: `writeSearchIndex` reads every prerendered page in `dist/client`, so
// the index holds exactly what was shipped. Development: the `searchIndex`
// plugin renders the same pages through the dev server's SSR entry on the
// first request for `/search-index.json` and again after a source change.
// Component pages render their content on the client, so they are indexed
// from source: the `*.doc.tsx` description and the component file's exports.

import fs from 'node:fs'
import path from 'node:path'

/** File name of the index, served from the site root. */
export const SEARCH_INDEX_FILE = 'search-index.json'

/** Longest body text kept per section, in characters. */
const TEXT_LIMIT = 900
/** Most code identifiers kept per section. */
const CODE_LIMIT = 60

const VOID = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'source',
  'track',
  'wbr',
])
/** Elements whose text is navigation, chrome or not text at all. */
const SKIP = new Set([
  'script',
  'style',
  'svg',
  'nav',
  'aside',
  'footer',
  'button',
  'select',
  'textarea',
  'template',
  'noscript',
  'figcaption',
])
/** Elements that end a word: text on either side must not run together. */
const BLOCK = new Set([
  'p',
  'div',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'pre',
  'table',
  'tr',
  'td',
  'th',
  'br',
  'section',
  'article',
  'header',
  'figure',
  'blockquote',
  'dt',
  'dd',
  'label',
])
const HEADINGS = new Set(['h1', 'h2', 'h3'])
/**
 * Pages that exist only to send the reader elsewhere. A page can also opt out
 * by putting `data-search="off"` on any element inside its `<main>`.
 */
const NOT_CONTENT = /\b(?:was not found|has moved)\.?$/i

/** Words that appear in every code sample and identify nothing. */
const CODE_NOISE = new Set(
  'import from export const let var function return type interface default as if else for of in new true false null undefined void this class extends async await typeof string number boolean'.split(
    ' ',
  ),
)

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }

function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (whole, code) => {
    if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? whole
    const point =
      code[1].toLowerCase() === 'x'
        ? Number.parseInt(code.slice(2), 16)
        : Number.parseInt(code.slice(1), 10)
    return Number.isFinite(point) ? String.fromCodePoint(point) : whole
  })
}

const squash = (text) => text.replace(/\s+/g, ' ').trim()

function attribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)${name}(?:=(?:"([^"]*)"|'([^']*)'))?(?=\\s|$)`),
  )
  if (!match) return undefined
  return decode(match[1] ?? match[2] ?? '')
}

/** A generated id (React's `useId`) changes between builds; never link to it. */
const stableId = (id) => (id && !/^(?:_R_|_r_|:r)/i.test(id) ? id : '')

/** Identifiers worth finding in a code sample, in order, without repeats. */
function identifiers(code, into) {
  for (const match of code.matchAll(
    /[@$]?[A-Za-z_][\w$]*(?:-[A-Za-z][\w$]*)*/g,
  )) {
    const word = match[0]
    if (word.length < 2 || CODE_NOISE.has(word)) continue
    if (into.size >= CODE_LIMIT) return
    into.add(word)
  }
}

function clip(text) {
  if (text.length <= TEXT_LIMIT) return text
  const cut = text.lastIndexOf(' ', TEXT_LIMIT)
  return text.slice(0, cut > 0 ? cut : TEXT_LIMIT)
}

/**
 * Reads one rendered page: its title, and one section per heading with the
 * text and code identifiers under it. Only `<main>` is read.
 *
 * @param {string} html
 * @returns {{ title: string, excluded: boolean, sections: { id: string, heading: string, text: string, code: string }[] }}
 */
export function extractPage(html) {
  const sections = [{ id: '', heading: '', text: '', code: new Set() }]
  let current = sections[0]
  let title = ''
  /** @type {{ tag: string, skip: boolean }[]} */
  const stack = []
  let inMain = 0
  let skipping = 0
  let inPre = 0
  let inCode = 0
  /** @type {{ tag: string, id: string, text: string } | undefined} */
  let heading
  let inlineCode = ''
  // Adjacent links ("Get started" "Open the playground") must not run together.
  let linkEdge = false
  let excluded = false

  const token =
    /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>|([^<]+)/g
  for (const match of html.matchAll(token)) {
    const [, closing, rawTag, attributes = '', rawText] = match
    if (rawText !== undefined) {
      if (!inMain || skipping) continue
      const text = decode(rawText)
      if (heading) heading.text += text
      else if (inPre) identifiers(text, current.code)
      else {
        if (
          linkEdge &&
          /[\p{L}\p{N}]$/u.test(current.text) &&
          /^[\p{L}\p{N}]/u.test(text)
        )
          current.text += ' '
        current.text += text
        if (inCode) inlineCode += text
      }
      linkEdge = false
      continue
    }
    if (!rawTag) continue
    const tag = rawTag.toLowerCase()
    if (tag === 'a') linkEdge = true

    if (!closing) {
      const selfClosing = VOID.has(tag) || attributes.endsWith('/')
      if (inMain && !skipping && BLOCK.has(tag)) {
        if (heading) heading.text += ' '
        else current.text += ' '
      }
      if (selfClosing) continue
      const skip =
        SKIP.has(tag) ||
        attribute(attributes, 'hidden') !== undefined ||
        attribute(attributes, 'aria-hidden') === 'true'
      stack.push({ tag, skip })
      if (skip) skipping++
      if (tag === 'main') inMain++
      if (inMain && attribute(attributes, 'data-search') === 'off')
        excluded = true
      if (!inMain || skipping) continue
      if (tag === 'pre') inPre++
      if (tag === 'code' && !inPre) {
        inCode++
        inlineCode = ''
      }
      if (HEADINGS.has(tag) && !heading)
        heading = { tag, id: stableId(attribute(attributes, 'id')), text: '' }
      continue
    }

    // Close up to the matching open tag; stray closers are ignored.
    const index = stack.findLastIndex((open) => open.tag === tag)
    if (index < 0) continue
    const live = inMain && !skipping
    for (const open of stack.splice(index)) if (open.skip) skipping--
    if (tag === 'main') inMain--
    if (!live) continue
    if (BLOCK.has(tag)) {
      if (heading && heading.tag !== tag) heading.text += ' '
      else current.text += ' '
    }
    if (tag === 'pre') inPre--
    if (tag === 'code' && !inPre && inCode) {
      inCode--
      identifiers(inlineCode, current.code)
    }
    if (heading && heading.tag === tag) {
      const text = squash(heading.text)
      if (tag === 'h1' && !title) {
        // Whatever came before the title (a breadcrumb) is not page text.
        title = text
        // The not-found page announces itself with a "404" breadcrumb.
        if (squash(current.text) === '404') excluded = true
        current.text = ''
      } else if (text && heading.id) {
        current = { id: heading.id, heading: text, text: '', code: new Set() }
        sections.push(current)
      } else if (text) {
        // No stable anchor to link to: the heading stays searchable as text
        // of the section it sits in.
        current.text += ` ${text}. `
      }
      heading = undefined
    }
  }

  return {
    title,
    excluded: excluded || NOT_CONTENT.test(title),
    sections: sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      text: clip(squash(section.text)),
      code: [...section.code].join(' '),
    })),
  }
}

/** Which result group a page belongs to, and the section it sits in. */
function classify(url, html) {
  if (url.startsWith('/learn/')) return 'r'
  if (url.startsWith('/ui/')) return 'c'
  return html.includes('id="docs-article"') ? 'd' : 'p'
}

function breadcrumb(html) {
  const match = html.match(/<p[^>]*>([^<]*)<\/p><div id="docs-article"/)
  return match ? squash(decode(match[1])) : ''
}

const titleCase = (name) =>
  name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

/** Names of the documented components in the gallery. */
export function componentNames(componentsDir) {
  if (!fs.existsSync(componentsDir)) return []
  return fs
    .readdirSync(componentsDir)
    .filter((file) => file.endsWith('.tsx') && !file.endsWith('.doc.tsx'))
    .map((file) => file.slice(0, -4))
    .sort()
}

/** A string literal's value, read without evaluating the file. */
function literalAfter(source, pattern) {
  const start = source.search(pattern)
  if (start < 0) return ''
  const rest = source.slice(start).replace(pattern, '')
  const quote = rest.trimStart()[0]
  if (quote !== "'" && quote !== '"' && quote !== '`') return ''
  const body = rest.trimStart().slice(1)
  let out = ''
  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if (char === '\\') {
      out += body[++i] ?? ''
      continue
    }
    if (char === quote) return out
    out += char
  }
  return ''
}

function componentPage(componentsDir, name) {
  const read = (file) => {
    const full = path.join(componentsDir, file)
    return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : ''
  }
  const source = read(`${name}.tsx`)
  const exported = new Set()
  for (const match of source.matchAll(
    /export\s+(?:default\s+)?(?:function|const|class)\s+([A-Z]\w*)/g,
  ))
    exported.add(match[1])
  for (const match of source.matchAll(/export\s*\{([^}]*)\}/g))
    for (const part of match[1].split(',')) {
      const exportedName = part
        .trim()
        .split(/\s+as\s+/)
        .pop()
      if (exportedName && /^[A-Z]\w*$/.test(exportedName))
        exported.add(exportedName)
    }
  return {
    url: `/ui/${name}`,
    title: titleCase(name),
    kind: 'c',
    group: 'Components',
    sections: [
      {
        id: '',
        heading: '',
        text: squash(literalAfter(read(`${name}.doc.tsx`), /description\s*:/)),
        code: [...exported].slice(0, CODE_LIMIT).join(' '),
      },
    ],
  }
}

/**
 * Builds the index from rendered pages and the component sources.
 *
 * Shape (kept positional to stay small):
 * `p`: pages as `[url, title, kind, group]`, kind being `d` docs, `r`
 * reference, `c` component or `p` page;
 * `s`: sections as `[pageIndex, anchorId, heading, text, codeIdentifiers]`.
 * A page's first section has no heading and holds the text under its title.
 *
 * @param {{ pages: { url: string, html: string }[], componentsDir?: string }} input
 */
export function buildSearchIndex({ pages, componentsDir }) {
  const entries = []
  for (const { url, html } of pages) {
    // Component pages are filled in on the client; they come from source below.
    if (url.startsWith('/ui/')) continue
    const page = extractPage(html)
    if (!page.title || page.excluded) continue
    const kind = classify(url, html)
    entries.push({
      url,
      title: page.title,
      kind,
      group: breadcrumb(html),
      sections: page.sections,
    })
  }
  if (componentsDir)
    for (const name of componentNames(componentsDir))
      entries.push(componentPage(componentsDir, name))

  entries.sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0))
  const p = []
  const s = []
  entries.forEach((entry, index) => {
    p.push([entry.url, entry.title, entry.kind, entry.group])
    entry.sections.forEach((section, position) => {
      // Keep the page's own entry even when it has no lead text.
      if (position > 0 && !section.heading) return
      s.push([index, section.id, section.heading, section.text, section.code])
    })
  })
  return { v: 1, p, s }
}

function htmlFiles(dir, base = dir) {
  const found = []
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name)
    if (item.isDirectory()) {
      if (item.name !== 'assets') found.push(...htmlFiles(full, base))
    } else if (item.name.endsWith('.html')) {
      const relative = path
        .relative(base, full)
        .split(path.sep)
        .join('/')
        .slice(0, -5)
      found.push({
        url: relative === 'index' ? '/' : `/${relative}`,
        html: fs.readFileSync(full, 'utf8'),
      })
    }
  }
  return found
}

/**
 * Build step: index every prerendered page under `clientDir` and write the
 * index next to them. Returns what it wrote, for the build log.
 */
export function writeSearchIndex({ clientDir, componentsDir }) {
  const index = buildSearchIndex({ pages: htmlFiles(clientDir), componentsDir })
  const json = JSON.stringify(index)
  fs.writeFileSync(path.join(clientDir, SEARCH_INDEX_FILE), json)
  return { pages: index.p.length, sections: index.s.length, bytes: json.length }
}

/** Static paths of the file-based routes: no dynamic segment, no layout file. */
function staticRoutes(routesDir) {
  const found = []
  const walk = (dir, prefix) => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (item.isDirectory()) {
        walk(path.join(dir, item.name), `${prefix}/${item.name}`)
        continue
      }
      if (!/\.tsx?$/.test(item.name)) continue
      const name = item.name.replace(/\.tsx?$/, '')
      if (name === '__root') continue
      const segments = `${prefix}/${name}`
        .split(/[/.]/)
        .filter(
          (part) =>
            part && part !== 'index' && part !== 'route' && part[0] !== '_',
        )
      if (segments.some((part) => part.includes('$'))) continue
      found.push(`/${segments.join('/')}`)
    }
  }
  if (fs.existsSync(routesDir)) walk(routesDir, '')
  return found
}

/**
 * Development: serves `/search-index.json`, rendering each page through the
 * server entry. The result is cached until a watched file changes.
 *
 * @param {{ componentsDir: string }} options
 * @returns {import('vite').Plugin}
 */
export function searchIndex({ componentsDir }) {
  return {
    name: 'search-index',
    apply: 'serve',
    configureServer(server) {
      /** @type {Promise<string> | undefined} */
      let cached
      const invalidate = () => {
        cached = undefined
      }
      server.watcher.on('change', invalidate)
      server.watcher.on('add', invalidate)
      server.watcher.on('unlink', invalidate)

      const generate = async () => {
        const root = server.config.root
        const urls = new Set(staticRoutes(path.join(root, 'src/routes')))
        // Pages behind a dynamic route are named by the navigation data.
        const { references } = await server.ssrLoadModule(
          '/src/content/references.ts',
        )
        for (const reference of references) urls.add(`/learn/${reference.slug}`)
        const { docsNav } = await server.ssrLoadModule('/src/content/nav.ts')
        for (const section of docsNav)
          for (const item of section.items) urls.add(item.to)

        const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
        const pages = []
        for (const url of urls) {
          if (url.startsWith('/ui/')) continue
          try {
            pages.push({ url, html: await render(url) })
          } catch (error) {
            server.config.logger.warn(
              `search-index: could not render ${url}: ${error?.message ?? error}`,
            )
          }
        }
        return JSON.stringify(buildSearchIndex({ pages, componentsDir }))
      }

      server.middlewares.use((request, response, next) => {
        const pathname = (request.url ?? '').split('?')[0]
        if (pathname !== `/${SEARCH_INDEX_FILE}`) return next()
        cached ??= generate()
        const pending = cached
        pending.then(
          (json) => {
            response.writeHead(200, {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
            })
            response.end(json)
          },
          (error) => {
            if (cached === pending) cached = undefined
            server.config.logger.error(`search-index: ${error?.stack ?? error}`)
            response.writeHead(500)
            response.end('The search index could not be generated.')
          },
        )
      })
    },
  }
}
