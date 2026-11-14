import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import {
  OUTPUT_PREFIX,
  type TonedOutput,
  outputModuleSource,
  parseOutputSpecifier,
} from '../outputs/index.ts'
import { type OutputsLoader, createOutputsLoader, hashFile } from '../outputs/runner.ts'

/** The part of Bun's plugin API this uses, so the package needs no Bun types. */
interface BunPluginBuilder {
  onResolve(
    options: { filter: RegExp; namespace?: string },
    callback: (args: { path: string }) => { path: string; namespace: string } | undefined,
  ): void
  onLoad(
    options: { filter: RegExp; namespace: string },
    callback: (args: { path: string }) => Promise<{ contents: string; loader: 'js' }>,
  ): void
}

export interface TonedBunPluginOptions {
  /**
   * Globs, relative to `root`, matching `<name>.toned.ts` output files. Without
   * them, the outputs the packages reachable from `root` declare in package.json.
   */
  outputs?: readonly string[]
  root?: string
  /**
   * A directory shared by the processes of a run, such as a test runner's
   * workers. The first process to load an output builds it and writes it here
   * with the root and a hash of every file it read; the others read it instead
   * of building their own while those files are unchanged.
   */
  cacheDir?: string
}

/** A cached output and the content hash of every file it was built from. */
interface CacheEntry {
  files: Record<string, string>
  output: TonedOutput
}

async function fresh(entry: CacheEntry): Promise<boolean> {
  const checks = await Promise.all(
    Object.entries(entry.files).map(async ([file, hash]) => (await hashFile(file)) === hash),
  )
  return checks.every(Boolean)
}

/** Read an output another process built from the same files, or build it and leave it for the next. */
async function cachedOutput(
  path: string,
  name: string,
  loader: OutputsLoader,
): Promise<TonedOutput> {
  const cached = await readFile(path, 'utf8').catch(() => undefined)
  if (cached !== undefined) {
    const entry = JSON.parse(cached) as CacheEntry
    if (await fresh(entry)) return entry.output
  }
  const output = await loader.load(name)
  const entry: CacheEntry = { files: Object.fromEntries(loader.sourceFiles(name)), output }
  await mkdir(join(path, '..'), { recursive: true })
  // Renamed into place whole, so a reader never sees a partial file.
  const temporary = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  await writeFile(temporary, JSON.stringify(entry))
  await rename(temporary, path)
  return output
}

/**
 * A Bun runtime plugin serving the same `toned:` specifiers to tests and
 * scripts, from the same loader as Vite and Metro: each output is evaluated by
 * Vite's module runner in its own module graph, never in the process importing
 * it. Register it from a preload with `Bun.plugin(tonedBunPlugin(...))`, or
 * preload `@toned/core/bun/register`. An output is built only when one of its
 * specifiers is first loaded. `toned:<name>` loads the CSS as a string, as
 * `toned:<name>/css` does; every data key loads, including by dynamic `import()`.
 */
export function tonedBunPlugin(options: TonedBunPluginOptions = {}) {
  const root = resolve(options.root ?? process.cwd())
  const loader = createOutputsLoader({ outputs: options.outputs, root })
  // Entries are per root and globs: another project's output of the same name is another entry.
  const scope = createHash('sha1')
    .update(JSON.stringify([root, options.outputs ?? null]))
    .digest('hex')
    .slice(0, 12)
  const loaded = new Map<string, Promise<TonedOutput>>()
  // Concurrent imports of one output share its load.
  const load = (name: string) => {
    const existing = loaded.get(name)
    if (existing) return existing
    const promise = options.cacheDir
      ? cachedOutput(join(options.cacheDir, `${name}.${scope}.output.json`), name, loader)
      : loader.load(name)
    loaded.set(name, promise)
    promise.catch(() => loaded.delete(name))
    return promise
  }
  return {
    name: 'toned:outputs',
    setup(build: BunPluginBuilder) {
      build.onResolve({ filter: /^toned:/ }, ({ path }) =>
        parseOutputSpecifier(path) ? { path, namespace: 'toned' } : undefined,
      )
      // Bun reads `toned:` as this plugin's namespace, and a dynamic `import()`
      // reaches only a resolver registered in it.
      build.onResolve({ filter: /.*/, namespace: 'toned' }, ({ path }) => ({
        path,
        namespace: 'toned',
      }))
      build.onLoad({ filter: /.*/, namespace: 'toned' }, async ({ path }) => {
        // The path may arrive with or without the prefix.
        const specifier =
          parseOutputSpecifier(path) ?? parseOutputSpecifier(`${OUTPUT_PREFIX}${path}`)
        if (!specifier) throw new Error(`not a Toned output specifier: ${path}`)
        const key = specifier.key ?? 'css'
        return {
          contents: outputModuleSource(await load(specifier.name), key, specifier.name),
          loader: 'js' as const,
        }
      })
    },
  }
}
