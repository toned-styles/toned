import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import type { InlineConfig, Plugin, RunnableDevEnvironment } from 'vite'

import { discoverOutputs } from './discover.ts'
import {
  type TonedOutput,
  outputFile,
  outputModuleSource,
  parseOutputSpecifier,
  toOutput,
} from './index.ts'

export interface OutputsOptions {
  /**
   * Globs, relative to `root`, matching `<name>.toned.ts` files. Without them,
   * the outputs the packages reachable from `root` declare in their package.json
   * (`"toned": { "outputs": [...] }`).
   */
  outputs?: readonly string[]
  root: string
  /** Extra Vite config for the runner that evaluates output files. JSX compiles automatically. */
  runner?: InlineConfig
}

const DEFAULT_RUNNER = { oxc: { jsx: { runtime: 'automatic' } } } as InlineConfig
const VIRTUAL = '\0'
const ENVIRONMENT = 'toned_outputs'

/** What one output read: its source files (with their content hashes) and the outputs it imported. */
interface Sources {
  files: Map<string, string>
  outputs: Set<string>
}

/** A content hash of a file, or `missing` when it is gone. */
export async function hashFile(file: string): Promise<string> {
  const content = await readFile(file).catch(() => undefined)
  return content ? createHash('sha1').update(content).digest('hex') : 'missing'
}

/**
 * Loads outputs with Vite's module runner. Loads that overlap share one module
 * runner and one module graph, so a module two outputs import is transformed
 * once; when the last of them settles the runner closes, and the next load starts
 * a fresh graph, so a changed declaration is always seen. An output file must
 * finish its work while it is imported (top-level `await`). Outputs a file imports
 * load first; outputs that import each other are an error, not a hang.
 */
export function createOutputsLoader(options: OutputsOptions) {
  let files = discoverOutputs(options.root, options.outputs)
  const loaded = new Map<string, Promise<TonedOutput>>()
  const sources = new Map<string, Sources>()

  // One runner for every load that overlaps.
  let session: Promise<RunnableDevEnvironment> | undefined
  let active = 0
  /** For the open session: which outputs wait for which, to report a cycle instead of hanging. */
  const waits = new Map<string, Set<string>>()

  const owners = (environment: RunnableDevEnvironment, importer: string | undefined) => {
    const byFile = new Map(Object.entries(files).map(([name, file]) => [file, name]))
    const found = new Set<string>()
    const seen = new Set<string>()
    const queue = importer ? [importer] : []
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      if (seen.has(id)) continue
      seen.add(id)
      const name = byFile.get(id.split('?')[0] ?? id)
      if (name) {
        found.add(name)
        continue
      }
      for (const parent of environment.moduleGraph.getModuleById(id)?.importers ?? [])
        if (parent.id) queue.push(parent.id)
      for (const parent of environment.runner.evaluatedModules.getModuleById(id)?.importers ?? [])
        queue.push(parent)
    }
    return found
  }

  /** The path by which `from` already waits for `to`, if it does. */
  const waitPath = (from: string, to: string): string[] | undefined => {
    const queue: string[][] = [[from]]
    const seen = new Set<string>()
    for (let path = queue.shift(); path; path = queue.shift()) {
      const last = path[path.length - 1] ?? from
      if (last === to) return path
      if (seen.has(last)) continue
      seen.add(last)
      for (const next of waits.get(last) ?? []) queue.push([...path, next])
    }
  }

  const modules = (environment: () => RunnableDevEnvironment): Plugin => ({
    name: 'toned:outputs-modules',
    resolveId(id, importer) {
      const specifier = parseOutputSpecifier(id)
      if (!specifier?.key) return
      for (const owner of owners(environment(), importer)) {
        const cycle = waitPath(specifier.name, owner)
        if (cycle) throw new Error(`Toned outputs import each other: ${[owner, ...cycle].join(' -> ')}`)
        waits.set(owner, (waits.get(owner) ?? new Set()).add(specifier.name))
      }
      return VIRTUAL + id
    },
    async load(id) {
      if (!id.startsWith(VIRTUAL)) return
      const specifier = parseOutputSpecifier(id.slice(VIRTUAL.length))
      if (!specifier?.key) return
      return outputModuleSource(await load(specifier.name), specifier.key, specifier.name)
    },
  })

  const open = async (): Promise<RunnableDevEnvironment> => {
    // Imported on first build, so a host served from a cache never loads Vite.
    const { createRunnableDevEnvironment, mergeConfig, resolveConfig } = await import('vite')
    let environment: RunnableDevEnvironment | undefined
    const config = await resolveConfig(
      mergeConfig(mergeConfig({ configFile: false, logLevel: 'error', ...DEFAULT_RUNNER }, options.runner ?? {}), {
        configFile: false,
        envDir: false,
        root: options.root,
        plugins: [modules(() => environment as RunnableDevEnvironment)],
        environments: {
          [ENVIRONMENT]: {
            consumer: 'server',
            dev: { moduleRunnerTransform: true },
            resolve: { external: true, mainFields: [], conditions: ['node'] },
          },
        },
      }),
      'serve',
    )
    environment = createRunnableDevEnvironment(ENVIRONMENT, config, {
      runnerOptions: { hmr: { logger: false } },
      hot: false,
    })
    await environment.init()
    return environment
  }

  const release = async () => {
    if (--active > 0 || !session) return
    const closing = session
    session = undefined
    waits.clear()
    await (await closing.catch(() => undefined))?.close()
  }

  /** Every file and output an output's module graph reached, from the runner's graph. */
  const graphOf = (environment: RunnableDevEnvironment, file: string): Sources => {
    const graph = environment.runner.evaluatedModules
    const found: Sources = { files: new Map([[file, '']]), outputs: new Set() }
    const queue = [...(graph.fileToModulesMap.get(file) ?? [])]
    const seen = new Set<string>()
    for (let node = queue.shift(); node; node = queue.shift()) {
      if (seen.has(node.id)) continue
      seen.add(node.id)
      if (node.id.startsWith(VIRTUAL)) {
        const specifier = parseOutputSpecifier(node.id.slice(VIRTUAL.length))
        if (specifier) found.outputs.add(specifier.name)
        continue
      }
      if (!node.meta || 'externalize' in node.meta) continue
      if (node.file) found.files.set(node.file, '')
      for (const id of node.imports) {
        const child = graph.getModuleById(id)
        if (child) queue.push(child)
      }
    }
    return found
  }

  const build = async (name: string, file: string): Promise<TonedOutput> => {
    active++
    let environment: RunnableDevEnvironment | undefined
    try {
      session ??= open()
      environment = await session
      const module = await environment.runner.import(file)
      const output = toOutput(module, file)
      const read = graphOf(environment, file)
      for (const input of output.inputs ?? []) read.files.set(input, '')
      await Promise.all([...read.files.keys()].map(async path => read.files.set(path, await hashFile(path))))
      sources.set(name, read)
      return output
    } catch (error) {
      // Keep what a failed build reached as well as what it read last, so an
      // edit to any of those files rebuilds it.
      const reached = environment ? graphOf(environment, file) : { files: new Map([[file, '']]), outputs: new Set<string>() }
      const previous = sources.get(name)
      sources.set(name, {
        files: new Map([...reached.files, ...(previous?.files ?? [])]),
        outputs: new Set([...reached.outputs, ...(previous?.outputs ?? [])]),
      })
      throw error
    } finally {
      await release()
    }
  }

  const load = (name: string): Promise<TonedOutput> => {
    const existing = loaded.get(name)
    if (existing) return existing
    if (!(name in files)) return Promise.reject(namedError(() => outputFile(files, name)))
    const promise = build(name, outputFile(files, name))
    loaded.set(name, promise)
    promise.catch(() => {
      if (loaded.get(name) === promise) loaded.delete(name)
    })
    return promise
  }

  const invalidateNames = (initial: Iterable<string>): string[] => {
    const stale = new Set(initial)
    // Outputs that imported a stale output are stale too, however far up.
    let added = true
    while (added) {
      added = false
      for (const [name, s] of sources) {
        if (stale.has(name) || ![...s.outputs].some(output => stale.has(output))) continue
        stale.add(name)
        added = true
      }
    }
    // Sources stay until a rebuild replaces them: a rebuild that fails, or one
    // still running, must not leave the next edit with nothing to match.
    for (const name of stale) loaded.delete(name)
    return [...stale]
  }

  /** Every file `name` read, including those of the outputs it imported, with their hashes. */
  const sourceFiles = (name: string, into = new Map<string, string>(), seen = new Set<string>()) => {
    if (seen.has(name)) return into
    seen.add(name)
    const own = sources.get(name)
    for (const [file, hash] of own?.files ?? []) into.set(file, hash)
    for (const output of own?.outputs ?? []) sourceFiles(output, into, seen)
    return into
  }

  return {
    get files(): Readonly<Record<string, string>> {
      return files
    },
    get names(): string[] {
      return Object.keys(files)
    },
    load,
    async loadAll(): Promise<Record<string, TonedOutput>> {
      const entries = await Promise.all(
        Object.keys(files).map(async name => [name, await load(name)] as const),
      )
      return Object.fromEntries(entries)
    },
    /** Every source file a loaded output read, including its declared `inputs`. */
    watchedFiles: () => [...new Set([...sources.values()].flatMap(s => [...s.files.keys()]))],
    /** The files `name` read, transitively, with their content hashes (after it loaded). */
    sourceFiles: (name: string): ReadonlyMap<string, string> => sourceFiles(name),
    /** Forget the outputs a changed file feeds, and those importing them. Returns their names. */
    invalidate(file: string): string[] {
      return invalidateNames(
        [...sources].filter(([, s]) => s.files.has(file)).map(([name]) => name),
      )
    },
    /**
     * Forget the outputs whose files changed since they loaded, by content, for a
     * host that builds again without a watcher (a second `vite build`).
     */
    async refresh(): Promise<string[]> {
      const changed = await Promise.all(
        [...sources].map(async ([name, s]) => {
          for (const [file, hash] of s.files) if ((await hashFile(file)) !== hash) return name
        }),
      )
      return invalidateNames(changed.filter((name): name is string => name !== undefined))
    },
    /**
     * Find the output files again (one was added or deleted) and forget every
     * output, since any of them may have imported one that moved. Returns whether
     * the set of outputs changed.
     */
    rediscover(): boolean {
      const next = discoverOutputs(options.root, options.outputs)
      const same =
        Object.keys(next).length === Object.keys(files).length &&
        Object.entries(next).every(([name, file]) => files[name] === file)
      files = next
      if (!same) {
        loaded.clear()
        sources.clear()
      }
      return !same
    },
  }
}

/** The error `fn` throws. */
function namedError(fn: () => unknown): unknown {
  try {
    fn()
  } catch (error) {
    return error
  }
  return new Error('unreachable')
}

export type OutputsLoader = ReturnType<typeof createOutputsLoader>

/** One output, for scripts and tools outside Vite, Bun's plugin and Metro. */
export function loadOutput(name: string, options: OutputsOptions): Promise<TonedOutput> {
  return createOutputsLoader(options).load(name)
}
