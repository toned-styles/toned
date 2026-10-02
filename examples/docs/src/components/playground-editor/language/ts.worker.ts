/**
 * The playground's language worker. It runs two services over the same three
 * documents, off the main thread:
 *
 * - TypeScript's language service, over an in-memory project that holds the
 *   playground files, the ES2022 + DOM libs, React's types and the Toned
 *   packages' own source. It is the authority on types.
 * - Toned's `DesignLanguageService`, a syntactic index of systems, tokens,
 *   sheets, parts and declarations. It knows the design vocabulary as data:
 *   which token a declaration uses, its allowed values and where it is defined.
 *
 * Nothing here touches the network beyond fetching its own chunks.
 */
import type { DesignLanguageService } from '@toned/compiler/language-service'
import type TypeScript from 'typescript'

import {
  cannotImportMessage,
  type FileName,
  fileNames,
  fileRecord,
  importableModules,
  localFile,
  MAX_FILE_CHARS,
} from '../types.ts'
import type {
  CompletionEntry,
  CompletionResult,
  FromWorker,
  HoverResult,
  LanguageProblem,
  LanguageRequest,
  SymbolDetails,
  TonedDetails,
  ToWorker,
  Versions,
} from './protocol.ts'

type TS = typeof TypeScript
/** One entry of a package's `exports` map: a file, or files by condition. */
type ExportTarget = string | { default?: string }

const scope = self as unknown as {
  postMessage(message: FromWorker): void
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<ToWorker>) => void,
  ): void
}

const PROJECT = '/playground/'
const TONED_ROOT = 'file:///workspace/'
const MAX_COMPLETIONS = 1500
const MAX_PROBLEMS_PER_FILE = 100

const documents = fileRecord(() => ({ text: '', version: 0 }))
const tsPath = (file: FileName) => `${PROJECT}${file}`
const tonedUri = (file: FileName) => `${TONED_ROOT}${file}`
const playgroundFile = (path: string) =>
  fileNames.find((file) => tsPath(file) === path)

type Engine = {
  ts: TS
  service: TypeScript.LanguageService
  toned: DesignLanguageService
  /** Toned index versions; it refuses a version it has already seen. */
  tonedVersions: Versions
}

function extensionOf(ts: TS, path: string) {
  if (path.endsWith('.d.ts')) return ts.Extension.Dts
  if (path.endsWith('.tsx')) return ts.Extension.Tsx
  return ts.Extension.Ts
}

function dirname(path: string) {
  return path.slice(0, path.lastIndexOf('/'))
}

function join(base: string, relative: string) {
  const parts = base.split('/')
  for (const part of relative.split('/')) {
    if (part === '.' || part === '') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  return parts.join('/')
}

async function start(): Promise<Engine> {
  const [tsModule, libs, react, tonedSources, languageService] =
    await Promise.all([
      import('typescript'),
      import('./types-lib.ts'),
      import('./types-react.ts'),
      import('./types-toned.ts'),
      import('@toned/compiler/language-service'),
    ])
  const ts = ((tsModule as { default?: TS }).default ?? tsModule) as TS

  const library = new Map<string, string>([
    ...Object.entries(libs.files),
    ...Object.entries(react.files),
    ...Object.entries(tonedSources.files),
  ])
  const snapshots = new Map<string, TypeScript.IScriptSnapshot>()

  // Each Toned package's `exports` map, as a browser bundler would read it.
  const packageExports = new Map<string, Record<string, string>>()
  for (const name of ['core', 'react', 'systems']) {
    const manifest = library.get(`/node_modules/@toned/${name}/package.json`)
    if (manifest)
      packageExports.set(
        name,
        Object.fromEntries(
          Object.entries(
            (JSON.parse(manifest) as { exports: Record<string, ExportTarget> })
              .exports,
          ).flatMap(([entry, target]) => {
            // A conditional export: the browser build is the default one. A
            // types-only entry has no default and nothing to import.
            const file = typeof target === 'string' ? target : target.default
            return file ? [[entry, file]] : []
          }),
        ),
      )
  }

  const read = (path: string) =>
    playgroundFile(path) !== undefined
      ? documents[playgroundFile(path) as FileName].text
      : library.get(path)

  function resolveLibrary(specifier: string, from: string) {
    if (specifier.startsWith('.')) {
      const base = join(dirname(from), specifier)
      const stem = base.replace(/\.(?:[cm]?js|jsx)$/, '')
      return [
        base,
        `${stem}.ts`,
        `${stem}.tsx`,
        `${stem}.d.ts`,
        `${stem}/index.ts`,
        `${stem}/index.tsx`,
        `${stem}/index.d.ts`,
      ].find((candidate) => /\.tsx?$/.test(candidate) && library.has(candidate))
    }
    if (specifier === 'react') return '/node_modules/@types/react/index.d.ts'
    if (specifier === 'react/jsx-runtime')
      return '/node_modules/@types/react/jsx-runtime.d.ts'
    if (specifier === 'csstype') return '/node_modules/csstype/index.d.ts'
    const toned = /^@toned\/(core|react|systems)(\/.+)?$/.exec(specifier)
    if (toned) {
      const target = packageExports.get(toned[1] as string)?.[
        `.${toned[2] ?? ''}`
      ]
      const path =
        target && join(`/node_modules/@toned/${toned[1]}`, String(target))
      return path && library.has(path) ? path : undefined
    }
    return undefined
  }

  /** The playground's own files see only what its runtime can load. */
  function resolvePlayground(specifier: string, from: string) {
    const local = localFile(specifier)
    if (local) return tsPath(local)
    if (
      specifier === 'react/jsx-runtime' ||
      (importableModules as readonly string[]).includes(specifier)
    )
      return resolveLibrary(specifier, from)
    return undefined
  }

  const options: TypeScript.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    moduleDetection: ts.ModuleDetectionKind.Force,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    allowImportingTsExtensions: true,
    isolatedModules: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  }

  const host: TypeScript.LanguageServiceHost = {
    getCompilationSettings: () => options,
    getScriptFileNames: () => fileNames.map(tsPath),
    getScriptVersion: (path) => {
      const file = playgroundFile(path)
      return file ? String(documents[file].version) : '1'
    },
    getScriptSnapshot: (path) => {
      const file = playgroundFile(path)
      if (file) return ts.ScriptSnapshot.fromString(documents[file].text)
      let snapshot = snapshots.get(path)
      if (!snapshot) {
        const text = library.get(path)
        if (text === undefined) return undefined
        snapshot = ts.ScriptSnapshot.fromString(text)
        snapshots.set(path, snapshot)
      }
      return snapshot
    },
    getCurrentDirectory: () => '/',
    getDefaultLibFileName: () => '/lib/lib.es2022.d.ts',
    useCaseSensitiveFileNames: () => true,
    fileExists: (path) => read(path) !== undefined,
    readFile: read,
    directoryExists: () => false,
    getDirectories: () => [],
    resolveModuleNameLiterals: (literals, containingFile) =>
      literals.map((literal) => {
        const path = playgroundFile(containingFile)
          ? resolvePlayground(literal.text, containingFile)
          : resolveLibrary(literal.text, containingFile)
        return {
          resolvedModule: path
            ? {
                resolvedFileName: path,
                extension: extensionOf(ts, path),
                isExternalLibraryImport: false,
              }
            : undefined,
        }
      }),
  }

  // Toned's index needs only the sources that declare a vocabulary: the base
  // system. Bounded like every other in-browser index on this site.
  const toned = new languageService.DesignLanguageService(
    new languageService.DesignProject({
      maxFiles: 48,
      maxCharacters: 400_000,
      maxDocumentCharacters: 2 * MAX_FILE_CHARS,
      maxNodesPerDocument: 4000,
    }),
  )
  toned.project.configureModules(TONED_ROOT, {
    '@toned/systems/base': ['node_modules/@toned/systems/base/index.ts'],
  })
  for (const [path, text] of Object.entries(tonedSources.files))
    if (
      path.startsWith('/node_modules/@toned/systems/') &&
      /\.tsx?$/.test(path)
    )
      toned.project.update(`${TONED_ROOT}${path.slice(1)}`, text, 1)

  return {
    ts,
    service: ts.createLanguageService(host, ts.createDocumentRegistry()),
    toned,
    tonedVersions: fileRecord(() => 0),
  }
}

/** Bring Toned's index up to the current text of every document. */
function syncToned(engine: Engine) {
  for (const file of fileNames) {
    const { text, version } = documents[file]
    if (engine.tonedVersions[file] === version) continue
    engine.tonedVersions[file] = version
    try {
      engine.toned.project.update(tonedUri(file), text, version)
    } catch {
      // Over a budget: the file simply has no design index until it shrinks.
      engine.toned.forget(tonedUri(file))
    }
  }
}

function lineAndColumn(text: string, offset: number) {
  let line = 1
  let lineStart = 0
  for (
    let index = text.indexOf('\n');
    index !== -1 && index < offset;
    index = text.indexOf('\n', index + 1)
  ) {
    line++
    lineStart = index + 1
  }
  return { line, column: offset - lineStart + 1 }
}

function listValues(values: readonly unknown[]) {
  const shown = values.slice(0, 40).map((value) => String(value))
  return (
    shown.join(', ') +
    (values.length > shown.length
      ? `, … ${values.length - shown.length} more`
      : '')
  )
}

/** `file:///workspace/node_modules/@toned/systems/base/colour.ts` → package path. */
function displayUri(uri: string) {
  return uri.replace(TONED_ROOT, '').replace(/^node_modules\//, '')
}

/** The token a declaration at `offset` uses, found through Toned's definitions. */
function tokenAt(engine: Engine, uri: string, offset: number) {
  const { toned } = engine
  const document = toned.document(uri)
  const node = toned.project.at(uri, offset)
  if (!document || node?.kind !== 'declaration') return undefined
  for (const target of toned.definition(
    uri,
    document.positionAt(node.selection.start),
  )) {
    const targetDocument = toned.document(target.uri)
    const token =
      targetDocument &&
      toned.project.at(target.uri, targetDocument.offsetAt(target.range.start))
    if (token?.kind === 'token') return { token, target }
  }
  return undefined
}

function diagnostics(engine: Engine) {
  const { ts, service, toned } = engine
  const started = performance.now()
  syncToned(engine)
  const problems: LanguageProblem[] = []
  const versions = {} as Versions
  for (const file of fileNames) {
    const { text, version } = documents[file]
    versions[file] = version
    const path = tsPath(file)
    const syntactic = service.getSyntacticDiagnostics(path)
    const found: LanguageProblem[] = []
    // A file that does not parse reports its syntax errors only: the type
    // errors that cascade from them are noise until it parses again.
    for (const item of syntactic.length
      ? syntactic
      : [...syntactic, ...service.getSemanticDiagnostics(path)]) {
      if (item.start === undefined) continue
      const from = item.start
      const to = from + (item.length ?? 0)
      let message = ts.flattenDiagnosticMessageText(item.messageText, '\n')
      // An import the preview cannot load: say so in the runtime's own words.
      if (item.code === 2307 || item.code === 2792)
        message = cannotImportMessage(text.slice(from + 1, to - 1))
      found.push({
        file,
        from,
        to,
        ...lineAndColumn(text, from),
        severity:
          item.category === ts.DiagnosticCategory.Error
            ? 'error'
            : item.category === ts.DiagnosticCategory.Warning
              ? 'warning'
              : 'info',
        source: 'ts',
        code: `TS${item.code}`,
        message,
      })
    }

    const uri = tonedUri(file)
    const document = toned.document(uri)
    if (document && !syntactic.length)
      for (const item of toned.diagnostics(uri)) {
        const from = document.offsetAt(item.range.start)
        const to = document.offsetAt(item.range.end)
        // LSP 3.18 diagnostics may carry Markdown content instead of text.
        let message =
          typeof item.message === 'string' ? item.message : item.message.value
        if (item.code === 'token-value') {
          const token = tokenAt(engine, uri, from)?.token
          const allowed = token?.values
            ? `Allowed ${token.name} values: ${listValues(token.values)}`
            : ''
          // TypeScript reports the same mistake on the property name (not
          // assignable). One mistake is one problem: keep the type error and
          // give it Toned's readable list instead of counting it twice.
          const { line } = lineAndColumn(text, from)
          const typeError = found.find(
            (problem) =>
              problem.source === 'ts' &&
              problem.line === line &&
              (problem.code === 'TS2322' || problem.code === 'TS2820'),
          )
          if (typeError) {
            if (allowed) typeError.message += `\n${allowed}`
            continue
          }
          if (allowed) message += `\n${allowed}`
        }
        found.push({
          file,
          from,
          to,
          ...lineAndColumn(text, from),
          severity:
            item.severity === 1
              ? 'error'
              : item.severity === 2
                ? 'warning'
                : 'info',
          source: 'toned',
          code: String(item.code ?? 'toned'),
          message,
        })
      }
    found.sort((a, b) => a.from - b.from || a.source.localeCompare(b.source))
    problems.push(...found.slice(0, MAX_PROBLEMS_PER_FILE))
  }
  return { versions, problems, ms: performance.now() - started }
}

const completionKinds: Record<string, string> = {
  keyword: 'keyword',
  function: 'function',
  'local function': 'function',
  method: 'method',
  constructor: 'method',
  class: 'class',
  'local class': 'class',
  interface: 'interface',
  type: 'type',
  alias: 'variable',
  'type parameter': 'type',
  enum: 'enum',
  'enum member': 'enum',
  module: 'namespace',
  'external module name': 'namespace',
  property: 'property',
  getter: 'property',
  setter: 'property',
  var: 'variable',
  let: 'variable',
  const: 'constant',
  'local var': 'variable',
  parameter: 'variable',
  string: 'text',
  'JSX attribute': 'property',
}

function completions(
  engine: Engine,
  request: Extract<LanguageRequest, { kind: 'completions' }>,
): CompletionResult | null {
  const { service, toned } = engine
  const { file, position } = request
  const text = documents[file].text
  if (position > text.length) return null
  syncToned(engine)

  const trigger = request.trigger
  const result = service.getCompletionsAtPosition(tsPath(file), position, {
    includeCompletionsWithInsertText: true,
    includeCompletionsForModuleExports: false,
    quotePreference: 'single',
    ...(trigger && /^[.'"`]$/.test(trigger)
      ? { triggerCharacter: trigger as TypeScript.CompletionsTriggerCharacter }
      : {}),
  })

  let from = position
  while (from > 0 && /[\w$]/.test(text[from - 1] as string)) from--
  let to = position
  const span = result?.optionalReplacementSpan
  if (span) {
    from = span.start
    to = Math.max(position, span.start + span.length)
  }
  const before = text.slice(0, from)
  const quote = before[before.length - 1]
  const inString = quote === "'" || quote === '"' || quote === '`'

  const entries = new Map<string, CompletionEntry>()
  for (const entry of result?.entries ?? []) {
    if (entries.size >= MAX_COMPLETIONS) break
    const priority = Number.parseInt(entry.sortText, 10)
    entries.set(entry.name, {
      label: entry.name,
      kind: completionKinds[entry.kind] ?? 'variable',
      origin: 'ts',
      boost: Number.isFinite(priority)
        ? Math.max(-40, Math.min(20, 2 * (11 - priority)))
        : 0,
      ...(entry.insertText && entry.insertText !== entry.name
        ? { insert: entry.insertText }
        : {}),
      ...(entry.replacementSpan
        ? {
            range: {
              from: entry.replacementSpan.start,
              to: entry.replacementSpan.start + entry.replacementSpan.length,
            },
          }
        : {}),
      ts: {
        name: entry.name,
        ...(entry.source ? { source: entry.source } : {}),
        ...(entry.data ? { data: entry.data } : {}),
      },
    })
  }

  // Toned's design vocabulary, merged by label:
  // - a token VALUE is offered even when TypeScript has nothing to say, as
  //   for numeric scales, or before any quote has been typed;
  // - a token NAME only annotates the property TypeScript also offers, since
  //   Toned suggests names anywhere inside a sheet and TypeScript knows where
  //   a property is valid;
  // - a variant AXIS is ranked above the function members `$.` also has.
  const uri = tonedUri(file)
  const document = toned.document(uri)
  if (document) {
    const list = toned.completions(uri, document.positionAt(position))
    const owner = tokenAt(engine, uri, position)
    const describe = (name: string, count: number | undefined, where = '') =>
      `One of ${count ?? 'the'} ${name} values${where}`
    const valueInfo = owner
      ? describe(
          owner.token.name,
          owner.token.values?.length,
          `, defined in ${displayUri(owner.target.uri)}:${owner.target.range.start.line + 1}`,
        )
      : undefined
    // Values keep their vocabulary order (a scale reads 0, 1, 2 … not 1, 10).
    let ranked = 0
    const rank = () => Math.max(45, 95 - ranked++ * 0.1)
    const addValue = (
      label: string,
      token: string,
      info: string | undefined,
      insert: string,
      range: { from: number; to: number },
    ) => {
      const existing = entries.get(label)
      const detail = `${token} value`
      entries.set(
        label,
        existing
          ? {
              ...existing,
              origin: 'both',
              detail,
              ...(info ? { tonedInfo: info } : {}),
              boost: rank(),
            }
          : {
              label,
              kind: 'enum',
              origin: 'toned',
              detail,
              ...(info ? { tonedInfo: info } : {}),
              boost: rank(),
              insert,
              range,
            },
      )
    }
    // `gap: ▮` — a declaration with no value yet. Toned lists the sheet's
    // tokens here; the one being declared supplies its values.
    const declaring =
      !inString && /([A-Za-z_$][\w$]*)\s*:\s*$/.exec(text.slice(0, from))?.[1]
    // `Root: { ▮ }` — where a declaration's name goes. TypeScript infers a
    // stylesheet's type FROM this literal, so it has no names to offer here.
    const inside = toned.project.at(uri, position)
    const namingDeclaration =
      !inString &&
      (inside?.kind === 'part' || inside?.kind === 'declaration') &&
      /[{,]\s*$/.test(text.slice(0, from))
    for (const item of list.items) {
      const edit =
        item.textEdit && 'range' in item.textEdit ? item.textEdit : undefined
      if (edit) {
        addValue(
          item.label,
          item.detail?.split('.').pop() ?? 'token',
          valueInfo,
          edit.newText,
          {
            from: document.offsetAt(edit.range.start),
            to: document.offsetAt(edit.range.end),
          },
        )
        continue
      }
      let values: unknown
      try {
        values = JSON.parse(String(item.documentation))
      } catch {
        values = undefined
      }
      if (declaring === item.label && Array.isArray(values)) {
        for (const value of values.slice(0, 500))
          addValue(
            String(value),
            item.label,
            describe(item.label, values.length),
            typeof value === 'string'
              ? `'${value.replace(/['\\]/g, '\\$&')}'`
              : String(value),
            { from, to: position },
          )
        continue
      }
      const existing = entries.get(item.label)
      const named =
        (existing?.kind === 'property' && !inString) || namingDeclaration
      if (!named) continue
      entries.set(item.label, {
        ...(existing ?? { label: item.label, kind: 'property' }),
        origin: existing ? 'both' : 'toned',
        detail: item.detail?.replace(/^Toned token · /, '') ?? 'token',
        tonedInfo: Array.isArray(values)
          ? values.length
            ? `Allowed values: ${listValues(values)}`
            : 'No enumerable values: this token takes a computed value.'
          : String(item.documentation ?? ''),
        boost: Math.min(99, (existing?.boost ?? 10) + 10),
      })
    }
    // The word being typed is not a suggestion for itself.
    const typed = text.slice(from, position)
    if (namingDeclaration && entries.get(typed)?.origin === 'ts')
      entries.delete(typed)

    // `$.▮` inside `.variants(($) => …)`: the sheet's axes, from Toned's index.
    const node = toned.project.at(uri, position)
    const sheet =
      node &&
      toned.project.lookup(node.owner, uri).find((n) => n.kind === 'sheet')
    const parameter =
      sheet &&
      /\.variants\(\s*\(?\s*([A-Za-z_$][\w$]*)/.exec(
        text.slice(sheet.span.start, sheet.span.end),
      )?.[1]
    if (
      sheet?.variants &&
      parameter &&
      text.slice(0, from).endsWith(`${parameter}.`)
    )
      for (const [axis, values] of Object.entries(sheet.variants)) {
        const existing = entries.get(axis)
        if (existing)
          entries.set(axis, {
            ...existing,
            origin: 'both',
            detail: 'variant axis',
            tonedInfo: values
              ? `Values: ${values.map(String).join(' | ')}`
              : 'Values are not statically known.',
            boost: Math.min(99, existing.boost + 30),
          })
      }
  }

  if (!entries.size) return null
  return { from, to, inString, entries: [...entries.values()] }
}

function symbolDetails(
  ts: TS,
  parts: readonly TypeScript.SymbolDisplayPart[] | undefined,
  documentation: readonly TypeScript.SymbolDisplayPart[] | undefined,
  tags: readonly TypeScript.JSDocTagInfo[] | undefined,
): SymbolDetails {
  const docs = ts.displayPartsToString(documentation as never).trim()
  return {
    signature: ts.displayPartsToString(parts as never),
    ...(docs ? { docs } : {}),
    ...(tags?.length
      ? {
          tags: tags.slice(0, 12).map((tag) => ({
            name: tag.name,
            text: ts.displayPartsToString(tag.text as never),
          })),
        }
      : {}),
  }
}

function completionDetails(
  engine: Engine,
  request: Extract<LanguageRequest, { kind: 'completionDetails' }>,
): SymbolDetails | null {
  const { ts, service } = engine
  const details = service.getCompletionEntryDetails(
    tsPath(request.file),
    request.position,
    request.entry.name,
    {},
    request.entry.source,
    { quotePreference: 'single' },
    request.entry.data as TypeScript.CompletionEntryData | undefined,
  )
  if (!details) return null
  const result = symbolDetails(
    ts,
    details.displayParts,
    details.documentation,
    details.tags,
  )
  return result.signature || result.docs ? result : null
}

function prettyFact(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown
    if (Array.isArray(parsed)) return listValues(parsed)
    if (parsed && typeof parsed === 'object')
      return Object.entries(parsed as Record<string, unknown>)
        .map(
          ([axis, values]) =>
            `${axis}: ${Array.isArray(values) ? values.map(String).join(' | ') : 'dynamic'}`,
        )
        .join('\n')
  } catch {
    // Source text, shown as written.
  }
  return value
}

function tonedHover(
  engine: Engine,
  file: FileName,
  position: number,
): (TonedDetails & { from: number; to: number }) | undefined {
  const { toned } = engine
  const uri = tonedUri(file)
  const document = toned.document(uri)
  if (!document) return undefined
  const at = document.positionAt(position)
  const facts: TonedDetails['facts'] = []
  let from: number
  let to: number
  let hover = null as ReturnType<DesignLanguageService['hover']>

  const node = toned.project.at(uri, position)
  const within = (span?: { start: number; end: number }) =>
    span !== undefined && span.start <= position && position <= span.end
  if (node && (within(node.selection) || within(node.valueSpan))) {
    // On a design node's own name or value.
    hover = toned.hover(uri, at)
    const span = within(node.selection)
      ? node.selection
      : (node.valueSpan as { start: number; end: number })
    from = span.start
    to = span.end
  } else {
    // On a reference, such as a stylesheet imported into App.tsx.
    const reference = toned.project
      .get(uri)
      ?.references.find(
        (entry) => entry.span.start <= position && position <= entry.span.end,
      )
    const target = reference && toned.definition(uri, at)[0]
    if (!reference || !target) return undefined
    hover = toned.hover(target.uri, target.range.start)
    from = reference.span.start
    to = reference.span.end
    facts.push({
      label: 'Defined in',
      value: `${displayUri(target.uri)}:${target.range.start.line + 1}`,
    })
  }
  const contents = hover?.contents
  if (!contents || typeof contents !== 'object' || !('value' in contents))
    return undefined
  const [title = '', ...lines] = contents.value.split('\n\n')
  for (const line of lines) {
    const split = line.indexOf(': ')
    if (split === -1) facts.unshift({ label: 'Note', value: line })
    else
      facts.push({
        label: line.slice(0, split),
        value: prettyFact(line.slice(split + 2)),
      })
  }

  // A declaration resolves to the token that defines its vocabulary.
  const found = tokenAt(engine, uri, position)
  if (found) {
    const { token, target } = found
    facts.push({
      label: 'Token',
      value: `${token.name} · ${token.values ? `${token.values.length} values` : 'dynamic values'}`,
    })
    if (token.values?.length)
      facts.push({ label: 'Allowed values', value: listValues(token.values) })
    facts.push({
      label: 'Defined in',
      value: `${displayUri(target.uri)}:${target.range.start.line + 1}`,
    })
  }
  return { title, facts, from, to }
}

function hover(
  engine: Engine,
  request: Extract<LanguageRequest, { kind: 'hover' }>,
): HoverResult | null {
  const { ts, service } = engine
  const { file, position } = request
  if (position > documents[file].text.length) return null
  syncToned(engine)
  const info = service.getQuickInfoAtPosition(tsPath(file), position)
  const toned = tonedHover(engine, file, position)
  if (!info && !toned) return null
  const details =
    info && symbolDetails(ts, info.displayParts, info.documentation, info.tags)
  return {
    from: info ? info.textSpan.start : (toned?.from ?? position),
    to: info
      ? info.textSpan.start + info.textSpan.length
      : (toned?.to ?? position),
    ...(details?.signature ? { ts: details } : {}),
    ...(toned ? { toned: { title: toned.title, facts: toned.facts } } : {}),
  }
}

function answer(engine: Engine, request: LanguageRequest) {
  switch (request.kind) {
    case 'diagnostics':
      return diagnostics(engine)
    case 'completions':
      return completions(engine, request)
    case 'completionDetails':
      return completionDetails(engine, request)
    case 'hover':
      return hover(engine, request)
  }
}

// Requests wait in a queue and run one per task, so a `cancel` (or a newer
// request of the same kind) that arrives while the worker is busy removes
// stale work before it starts. A running TypeScript call cannot be interrupted.
type Pending = { id: number; request: LanguageRequest }
let queue: Pending[] = []
let draining = false
let engine: Promise<Engine> | undefined

function drain() {
  draining = false
  const next = queue.shift()
  if (!next) return
  const superseded =
    next.request.kind !== 'completionDetails' &&
    queue.some((later) => later.request.kind === next.request.kind)
  if (queue.length) schedule()
  if (superseded) return
  void engine?.then(
    (ready) => {
      try {
        scope.postMessage({
          type: 'response',
          id: next.id,
          result: answer(ready, next.request),
        })
      } catch (error) {
        scope.postMessage({
          type: 'error',
          id: next.id,
          message: error instanceof Error ? error.message : String(error),
        })
      }
    },
    () => undefined,
  )
}

function schedule() {
  if (draining) return
  draining = true
  setTimeout(drain, 0)
}

scope.addEventListener('message', (event) => {
  const message = event.data
  if (message.type === 'update') {
    documents[message.file] = { text: message.text, version: message.version }
    if (!engine) {
      const started = performance.now()
      engine = start()
      engine.then(
        (ready) =>
          scope.postMessage({
            type: 'ready',
            ms: performance.now() - started,
            typescript: ready.ts.version,
          }),
        (error: unknown) =>
          scope.postMessage({
            type: 'failed',
            message: error instanceof Error ? error.message : String(error),
          }),
      )
    }
    return
  }
  if (message.type === 'cancel') {
    queue = queue.filter((pending) => pending.id !== message.id)
    return
  }
  queue.push({ id: message.id, request: message.request })
  schedule()
})
