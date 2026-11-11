import { type InlineConfig, type Plugin, runnerImport } from 'vite'

import { discoverOutputs } from './discover.ts'
import {
  type TonedOutput,
  outputFile,
  outputModuleSource,
  parseOutputSpecifier,
  toOutput,
} from './index.ts'

export interface OutputsOptions {
  /** Globs, relative to `root`, matching `<name>.toned.ts` files. */
  outputs: readonly string[]
  root: string
  /** Extra Vite config for the runner that evaluates output files. JSX compiles automatically. */
  runner?: InlineConfig
}

const DEFAULT_RUNNER = { oxc: { jsx: { runtime: 'automatic' } } } as InlineConfig
const VIRTUAL = '\0'

/**
 * Loads outputs on demand with Vite's module runner. Each load evaluates the file
 * and what it imports afresh, so a changed declaration is always seen; an output
 * file must finish its work while it is imported (top-level `await`), because the
 * runner closes when the import settles. Outputs a file imports load first.
 */
export function createOutputsLoader(options: OutputsOptions) {
  const files = discoverOutputs(options.root, options.outputs)
  const loaded = new Map<string, Promise<TonedOutput>>()
  /** For each output, the source files it read and the outputs it imported. */
  const sources = new Map<string, { files: string[]; outputs: Set<string> }>()

  const load = (name: string, chain: readonly string[] = []): Promise<TonedOutput> => {
    if (chain.includes(name))
      throw new Error(`Toned outputs import each other: ${[...chain, name].join(' -> ')}`)
    const existing = loaded.get(name)
    if (existing) return existing
    const file = outputFile(files, name)
    const imported = new Set<string>()
    const modules: Plugin = {
      name: 'toned:outputs-modules',
      resolveId(id) {
        if (parseOutputSpecifier(id)?.key) return VIRTUAL + id
      },
      async load(id) {
        if (!id.startsWith(VIRTUAL)) return
        const specifier = parseOutputSpecifier(id.slice(VIRTUAL.length))
        if (!specifier?.key) return
        imported.add(specifier.name)
        return outputModuleSource(await load(specifier.name, [...chain, name]), specifier.key)
      },
    }
    const promise = runnerImport<unknown>(file, {
      configFile: false,
      logLevel: 'error',
      ...DEFAULT_RUNNER,
      ...options.runner,
      root: options.root,
      plugins: [modules, ...(options.runner?.plugins ?? [])],
    }).then(({ module, dependencies }) => {
      sources.set(name, { files: [file, ...dependencies], outputs: imported })
      return toOutput(module, file)
    })
    loaded.set(name, promise)
    promise.catch(() => loaded.delete(name))
    return promise
  }

  return {
    files,
    names: Object.keys(files),
    load: (name: string) => load(name),
    async loadAll(): Promise<Record<string, TonedOutput>> {
      const entries = await Promise.all(
        Object.keys(files).map(async name => [name, await load(name)] as const),
      )
      return Object.fromEntries(entries)
    },
    /** Every source file a loaded output read. */
    watchedFiles: () => [...new Set([...sources.values()].flatMap(s => s.files))],
    /** Forget the outputs a changed file feeds, and those importing them. Returns their names. */
    invalidate(file: string): string[] {
      const stale = new Set(
        [...sources].filter(([, s]) => s.files.includes(file)).map(([name]) => name),
      )
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
      for (const name of stale) {
        loaded.delete(name)
        sources.delete(name)
      }
      return [...stale]
    },
  }
}

/** One output, for scripts and tools outside Vite, Bun's plugin and Metro. */
export function loadOutput(name: string, options: OutputsOptions): Promise<TonedOutput> {
  return createOutputsLoader(options).load(name)
}
