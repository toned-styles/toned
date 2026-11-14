import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { discoverOutputs } from '../outputs/discover.ts'
import {
  OUTPUT_PREFIX,
  type TonedOutput,
  outputFile,
  outputModuleSource,
  parseOutputSpecifier,
  toOutput,
} from '../outputs/index.ts'

/** The part of Bun's plugin API this uses, so the package needs no Bun types. */
interface BunPluginBuilder {
  module(specifier: string, callback: () => Promise<{ contents: string; loader: 'js' }>): void
  onResolve(
    options: { filter: RegExp },
    callback: (args: { path: string }) => { path: string; namespace: string } | undefined,
  ): void
  onLoad(
    options: { filter: RegExp; namespace: string },
    callback: (args: { path: string }) => Promise<{ contents: string; loader: 'js' }>,
  ): void
}

export interface TonedBunPluginOptions {
  /** Globs, relative to `root`, matching `<name>.toned.ts` output files. */
  outputs: readonly string[]
  root?: string
  /**
   * A directory shared by the processes of one run, such as a test runner's
   * workers. The first process to load an output builds it and writes it here;
   * the others read it instead of building their own. Nothing is invalidated, so
   * give each run a fresh directory.
   */
  cacheDir?: string
}

/** Read an output another process built, or build it and leave it for the next. */
async function cachedOutput(
  cacheDir: string,
  name: string,
  build: () => Promise<TonedOutput>,
): Promise<TonedOutput> {
  const path = join(cacheDir, `${name}.output.json`)
  const cached = await readFile(path, 'utf8').catch(() => undefined)
  if (cached !== undefined) return JSON.parse(cached) as TonedOutput
  const output = await build()
  await mkdir(cacheDir, { recursive: true })
  // Renamed into place whole, so a reader never sees a partial file.
  const temporary = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  await writeFile(temporary, JSON.stringify(output))
  await rename(temporary, path)
  return output
}

/**
 * A Bun runtime plugin serving the same `toned:` specifiers to tests and
 * scripts. Register it from a preload with `Bun.plugin(tonedBunPlugin(...))`.
 * An output file is imported only when one of its specifiers is first loaded.
 * `toned:<name>` loads the CSS as a string, as `toned:<name>/css` does.
 */
export function tonedBunPlugin(options: TonedBunPluginOptions) {
  const files = discoverOutputs(resolve(options.root ?? process.cwd()), options.outputs)
  const loaded = new Map<string, Promise<TonedOutput>>()
  // Concurrent imports of one output share its load.
  const load = (name: string) => {
    const existing = loaded.get(name)
    if (existing) return existing
    const file = outputFile(files, name)
    const build = () => import(file).then(module => toOutput(module, file))
    const promise = options.cacheDir ? cachedOutput(options.cacheDir, name, build) : build()
    loaded.set(name, promise)
    return promise
  }
  const source = async (name: string, key: string) => ({
    contents: outputModuleSource(await load(name), key),
    loader: 'js' as const,
  })
  return {
    name: 'toned:outputs',
    setup(build: BunPluginBuilder) {
      // Bun's resolve hooks do not see dynamic `import()`, so each output's CSS and
      // manifest are also registered as modules, which it does.
      for (const name of Object.keys(files))
        for (const key of ['css', 'manifest'])
          build.module(`${OUTPUT_PREFIX}${name}/${key}`, () => source(name, key))
      build.onResolve({ filter: /^toned:/ }, ({ path }) =>
        parseOutputSpecifier(path) ? { path, namespace: 'toned' } : undefined,
      )
      build.onLoad({ filter: /.*/, namespace: 'toned' }, ({ path }) => {
        // Bun reads `toned:` as this plugin's namespace, so the path may arrive without it.
        const specifier =
          parseOutputSpecifier(path) ?? parseOutputSpecifier(`${OUTPUT_PREFIX}${path}`)
        if (!specifier) throw new Error(`not a Toned output specifier: ${path}`)
        return source(specifier.name, specifier.key ?? 'css')
      })
    },
  }
}
