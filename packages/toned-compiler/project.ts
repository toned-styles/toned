import type {
  DesignDocument,
  DesignKind,
  DesignNode,
  DesignPage,
  DesignSnapshot,
} from './model.ts'
import { freezeDesignData, parseDesignDocument } from './source.ts'
import { StaticResolution } from './static-resolution.ts'

export interface ProjectOptions {
  readonly maxFiles?: number
  readonly maxCharacters?: number
  readonly maxDocumentCharacters?: number
  readonly maxNodesPerDocument?: number
}
export interface IndexStatistics {
  readonly parses: number
  readonly unchanged: number
  readonly files: number
  readonly characters: number
  readonly revision: number
}

/** Own one per workspace. Documents and indexes are explicitly removable/disposable. */
export class DesignProject {
  private readonly documents = new Map<string, DesignDocument>()
  private readonly localSymbols = new Map<string, Map<string, string[]>>()
  private readonly byId = new Map<string, DesignNode>()
  private readonly symbols = new Map<string, Set<string>>()
  private readonly kinds = new Map<DesignKind, Set<string>>()
  private readonly ranges = new Map<string, { size: number; ends: number[] }>()
  private readonly importers = new Map<string, Set<string>>()
  private readonly moduleMaps = new Map<
    string,
    Readonly<Record<string, readonly string[]>>
  >()
  private resolutionRevision = -1
  private readonly tokenCache = new Map<string, readonly DesignNode[]>()
  private characters = 0
  private parses = 0
  private unchanged = 0
  private generation = 0
  private readonly options: Required<ProjectOptions>

  constructor(options: ProjectOptions = {}) {
    this.options = {
      maxFiles: 4096,
      maxCharacters: 32_000_000,
      maxDocumentCharacters: 1_000_000,
      maxNodesPerDocument: 20_000,
      ...options,
    }
    for (const [name, value] of Object.entries(this.options))
      if (!Number.isSafeInteger(value) || value < 1)
        throw new Error(`Invalid Toned index budget ${name}`)
  }
  get revision() {
    return this.generation
  }
  get statistics(): IndexStatistics {
    return {
      parses: this.parses,
      unchanged: this.unchanged,
      files: this.documents.size,
      characters: this.characters,
      revision: this.generation,
    }
  }
  get(uri: string) {
    return this.documents.get(uri)
  }
  node(id: string) {
    return this.byId.get(id)
  }
  uris() {
    return [...this.documents.keys()].sort()
  }

  update(uri: string, text: string, version: number): DesignDocument {
    if (!Number.isSafeInteger(version))
      throw new Error('Document version must be an integer')
    const previous = this.documents.get(uri)
    if (previous && version < previous.version)
      throw new Error(`Stale document version: ${uri}`)
    if (previous?.text === text) {
      this.unchanged++
      const document =
        previous.version === version
          ? previous
          : Object.freeze({ ...previous, version })
      this.documents.set(uri, document)
      return document
    }
    if (previous && version === previous.version)
      throw new Error(`Conflicting document version: ${uri}`)
    if (!previous && this.documents.size >= this.options.maxFiles)
      throw new Error(
        'Toned workspace file budget exceeded; configure a narrower workspace',
      )
    const characters =
      this.characters - (previous?.text.length ?? 0) + text.length
    if (characters > this.options.maxCharacters)
      throw new Error(
        'Toned workspace character budget exceeded; configure a narrower workspace',
      )
    const document = parseDesignDocument(uri, text, version, {
      maxCharacters: this.options.maxDocumentCharacters,
      maxNodes: this.options.maxNodesPerDocument,
    })
    this.removeEdges(uri)
    if (previous) this.removeNodes(previous)
    this.documents.set(uri, document)
    const local = new Map<string, string[]>()
    for (const node of document.nodes) {
      const names = local.get(node.name) ?? []
      names.push(node.id)
      local.set(node.name, names)
      this.byId.set(node.id, node)
      const bucket = this.symbols.get(node.name) ?? new Set<string>()
      bucket.add(node.id)
      this.symbols.set(node.name, bucket)
      const kind = this.kinds.get(node.kind) ?? new Set<string>()
      kind.add(node.id)
      this.kinds.set(node.kind, kind)
    }
    this.localSymbols.set(uri, local)
    let size = 1
    while (size < document.nodes.length) size *= 2
    const ends = Array<number>(size * 2).fill(-1)
    document.nodes.forEach((node, index) => {
      ends[size + index] = node.span.end
    })
    for (let index = size - 1; index > 0; index--)
      ends[index] = Math.max(ends[index * 2]!, ends[index * 2 + 1]!)
    this.ranges.set(uri, { size, ends })
    // Import keys are lexical module candidates, so adding/removing a target does
    // not force reparsing its importers or leave stale dependency edges.
    for (const from of this.moduleSources(document))
      for (const target of this.importCandidates(uri, from)) {
        const bucket = this.importers.get(target) ?? new Set<string>()
        bucket.add(uri)
        this.importers.set(target, bucket)
      }
    this.characters = characters
    this.parses++
    this.generation++
    return document
  }
  remove(uri: string): boolean {
    const document = this.documents.get(uri)
    if (!document) return false
    this.removeEdges(uri)
    this.removeNodes(document)
    this.documents.delete(uri)
    this.localSymbols.delete(uri)
    this.ranges.delete(uri)
    this.characters -= document.text.length
    this.generation++
    return true
  }
  dispose() {
    this.documents.clear()
    this.localSymbols.clear()
    this.byId.clear()
    this.symbols.clear()
    this.kinds.clear()
    this.ranges.clear()
    this.importers.clear()
    this.characters = 0
    this.moduleMaps.clear()
    this.tokenCache.clear()
    this.generation++
  }
  private removeNodes(document: DesignDocument) {
    for (const node of document.nodes) {
      this.byId.delete(node.id)
      const bucket = this.symbols.get(node.name)
      bucket?.delete(node.id)
      if (bucket?.size === 0) this.symbols.delete(node.name)
      const kind = this.kinds.get(node.kind)
      kind?.delete(node.id)
      if (kind?.size === 0) this.kinds.delete(node.kind)
    }
  }
  private removeEdges(uri: string) {
    const document = this.documents.get(uri)
    if (!document) return
    for (const from of this.moduleSources(document))
      for (const target of this.importCandidates(uri, from)) {
        const bucket = this.importers.get(target)
        bucket?.delete(uri)
        if (bucket?.size === 0) this.importers.delete(target)
      }
  }
  private moduleSources(document: DesignDocument): readonly string[] {
    return [
      ...new Set([
        ...document.imports.map((entry) => entry.from),
        ...Object.values(document.module?.exports ?? {}).flatMap((entry) =>
          entry.from ? [entry.from] : [],
        ),
        ...(document.module?.stars ?? []),
      ]),
    ]
  }
  configureModules(
    rootUri: string,
    modules: Readonly<Record<string, readonly string[]>>,
  ): void {
    const root = new URL(rootUri.endsWith('/') ? rootUri : rootUri + '/')
    if (root.protocol !== 'file:' || Object.keys(modules).length > 128)
      throw new Error('Invalid Toned module mappings')
    const copy: Record<string, readonly string[]> = Object.create(null)
    for (const [name, targets] of Object.entries(modules)) {
      if (
        !name ||
        name.length > 512 ||
        name.split('*').length > 2 ||
        !Array.isArray(targets) ||
        !targets.length ||
        targets.length > 8
      )
        throw new Error('Invalid Toned module mapping')
      copy[name] = Object.freeze(
        targets.map((target) => {
          if (
            typeof target !== 'string' ||
            !target ||
            target.length > 2048 ||
            target.startsWith('/') ||
            target.includes('\\') ||
            target.includes(':') ||
            target.includes('%') ||
            target.includes('?') ||
            target.includes('#') ||
            target.split('/').includes('..') ||
            target.split('*').length > 2 ||
            (target.includes('*') && !name.includes('*'))
          )
            throw new Error('Invalid Toned module target')
          return target
        }),
      )
    }
    if (!this.moduleMaps.has(root.href) && this.moduleMaps.size >= 16)
      throw new Error('Toned module root budget exceeded')
    for (const uri of this.documents.keys()) this.removeEdges(uri)
    this.moduleMaps.set(root.href, Object.freeze(copy))
    this.importers.clear()
    for (const [uri, document] of this.documents)
      for (const from of this.moduleSources(document))
        for (const target of this.importCandidates(uri, from)) {
          const bucket = this.importers.get(target) ?? new Set<string>()
          bucket.add(uri)
          this.importers.set(target, bucket)
        }
    this.generation++
  }
  private importCandidates(uri: string, from: string): readonly string[] {
    let bases: string[] = []
    if (from.startsWith('.')) {
      try {
        bases = [new URL(from, uri).href]
      } catch {
        return []
      }
    } else {
      const roots = [...this.moduleMaps.keys()]
        .filter((root) => uri.startsWith(root))
        .sort((a, b) => b.length - a.length)
      for (const root of roots) {
        const matches = Object.entries(this.moduleMaps.get(root)!)
          .filter(([pattern]) => {
            const [prefix, suffix] = pattern.split('*')
            return suffix === undefined
              ? from === prefix
              : from.startsWith(prefix!) &&
                  from.endsWith(suffix) &&
                  from.length >= prefix!.length + suffix.length
          })
          .sort(
            ([a], [b]) =>
              Number(b === from) - Number(a === from) ||
              b.indexOf('*') - a.indexOf('*'),
          )
        if (matches.length) {
          const [pattern, targets] = matches[0]!,
            [prefix, suffix] = pattern.split('*')
          const middle =
            suffix === undefined
              ? ''
              : from.slice(prefix!.length, from.length - suffix.length)
          if (
            middle.split('/').includes('..') ||
            middle.includes('\\') ||
            middle.includes(':') ||
            middle.includes('%') ||
            middle.includes('?') ||
            middle.includes('#')
          )
            return []
          bases = targets.map(
            (target) => new URL(target.replace('*', middle), root).href,
          )
          break
        }
      }
    }
    return [
      ...new Set(
        bases.flatMap((base) => {
          const extension = /\.(?:[cm]?[jt]sx?)$/.exec(base)
          if (extension) {
            const stem = base.slice(0, -extension[0].length)
            return [base, `${stem}.ts`, `${stem}.tsx`]
          }
          return [
            base,
            ...['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'].map(
              (suffix) => base + suffix,
            ),
          ]
        }),
      ),
    ]
  }
  tokensForSystem(name: string, uri: string): readonly DesignNode[] {
    if (this.resolutionRevision !== this.generation) {
      this.tokenCache.clear()
      this.resolutionRevision = this.generation
    }
    const key = `${uri}#${name}`,
      cached = this.tokenCache.get(key)
    if (cached) return cached
    const tokens = Object.freeze(new StaticResolution(this).tokens(uri, name))
    if (this.tokenCache.size >= 256)
      this.tokenCache.delete(this.tokenCache.keys().next().value!)
    this.tokenCache.set(key, tokens)
    return tokens
  }
  resolveImport(uri: string, from: string): string | undefined {
    return this.importCandidates(uri, from).find((candidate) =>
      this.documents.has(candidate),
    )
  }
  lookup(
    name: string,
    uri?: string,
    seen = new Set<string>(),
  ): readonly DesignNode[] {
    if (uri) {
      const resolved = new StaticResolution(this).definition(uri, name)
      if (resolved) return [resolved]
      let currentUri: string = uri
      let currentName: string = name
      for (;;) {
        const key = `${currentUri}#${currentName}`
        if (seen.has(key)) return []
        seen.add(key)
        const local = (
          this.localSymbols.get(currentUri)?.get(currentName) ?? []
        ).map((id) => this.byId.get(id)!)
        if (local.length) return local
        const entry = this.documents
          .get(currentUri)
          ?.imports.find((item) => item.local === currentName)
        const target: string | undefined =
          entry && this.resolveImport(currentUri, entry.from)
        if (!target || !entry) return []
        currentName = entry.imported
        currentUri = target
      }
    }
    return [...(this.symbols.get(name) ?? [])].flatMap((id) => {
      const node = this.byId.get(id)
      return node ? [node] : []
    })
  }
  at(uri: string, offset: number): DesignNode | undefined {
    if (!Number.isSafeInteger(offset) || offset < 0) return undefined
    const nodes = this.documents.get(uri)?.nodes,
      tree = this.ranges.get(uri)
    if (!nodes || !tree) return undefined
    const find = (
      branch: number,
      start: number,
      end: number,
    ): DesignNode | undefined => {
      if (
        tree.ends[branch]! <= offset ||
        !nodes[start] ||
        nodes[start]!.span.start > offset
      )
        return undefined
      if (end - start === 1) return nodes[start]
      const middle = (start + end) >>> 1
      return (
        find(branch * 2 + 1, middle, end) ?? find(branch * 2, start, middle)
      )
    }
    return find(1, 0, tree.size)
  }
  query(
    options: {
      kind?: DesignKind
      name?: string
      uri?: string
      owner?: string
      offset?: number
      limit?: number
    } = {},
  ): DesignPage<DesignNode> {
    const offset = options.offset ?? 0,
      limit = options.limit ?? 100
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 500
    )
      throw new Error(
        'Design query requires a nonnegative offset and limit 1..500',
      )
    const fromIds = function* (
      ids: Iterable<string>,
      nodes: ReadonlyMap<string, DesignNode>,
    ) {
      for (const id of ids) yield nodes.get(id)!
    }
    const source =
      options.uri && options.name
        ? fromIds(
            this.localSymbols.get(options.uri)?.get(options.name) ?? [],
            this.byId,
          )
        : options.uri
          ? (this.documents.get(options.uri)?.nodes ?? [])
          : options.name
            ? fromIds(this.symbols.get(options.name) ?? [], this.byId)
            : options.kind
              ? fromIds(this.kinds.get(options.kind) ?? [], this.byId)
              : this.byId.values()
    const items: DesignNode[] = []
    let total = 0
    for (const node of source) {
      if (
        (options.kind && node.kind !== options.kind) ||
        (options.name && node.name !== options.name) ||
        (options.owner && node.owner !== options.owner)
      )
        continue
      if (total >= offset && items.length < limit) items.push(node)
      total++
    }
    return {
      items,
      total,
      ...(offset + items.length < total ? { next: offset + items.length } : {}),
      revision: this.generation,
    }
  }
  dependents(uri: string): readonly string[] {
    const visited = new Set<string>([uri]),
      queue = [uri]
    for (let index = 0; index < queue.length; index++)
      for (const importer of this.importers.get(queue[index]!) ?? [])
        if (!visited.has(importer)) {
          visited.add(importer)
          queue.push(importer)
        }
    return queue.sort()
  }
  referencesTo(
    node: DesignNode,
    options: { offset?: number; limit?: number } = {},
  ): DesignPage<{ uri: string; start: number; end: number }> {
    const offset = options.offset ?? 0,
      limit = options.limit ?? 500
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 500
    )
      throw new Error(
        'References require a nonnegative offset and limit 1..500',
      )
    const items: { uri: string; start: number; end: number }[] = []
    let total = 0
    // Named token fields/parts are not lexical JavaScript bindings. Claiming
    // references by their spelling would include unrelated variables.
    if (node.path.length || node.owner !== node.name)
      return { items, total, revision: this.generation }
    for (const uri of new Set([
      node.uri,
      ...(this.importers.get(node.uri) ?? []),
    ])) {
      const document = this.documents.get(uri)
      if (!document) continue
      const names = new Set(
        uri === node.uri
          ? [node.name]
          : document.imports
              .filter(
                (entry) =>
                  entry.imported === node.name &&
                  this.resolveImport(uri, entry.from) === node.uri,
              )
              .map((entry) => entry.local),
      )
      for (const reference of document.references)
        if (reference.owner === reference.name && names.has(reference.name)) {
          if (total >= offset && items.length < limit)
            items.push({ uri, ...reference.span })
          total++
        }
    }
    return {
      items,
      total,
      ...(offset + items.length < total ? { next: offset + items.length } : {}),
      revision: this.generation,
    }
  }
  snapshot(): DesignSnapshot {
    return freezeDesignData({
      revision: this.generation,
      nodes: [...this.byId.values()],
      diagnostics: [...this.documents.values()].flatMap((document) =>
        document.diagnostics.map((diagnostic) => ({
          ...diagnostic,
          uri: document.uri,
        })),
      ),
    })
  }
}
