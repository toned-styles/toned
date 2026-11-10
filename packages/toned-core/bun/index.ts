import { resolve } from 'node:path'

import {
  OUTPUT_PREFIX,
  type TonedOutputs,
  collectOutputs,
  outputFor,
  outputModuleSource,
  parseOutputSpecifier,
} from '../outputs/index.ts'

/** The part of Bun's plugin API this uses, so the package needs no Bun types. */
interface BunPluginBuilder {
  module(
    specifier: string,
    callback: () => Promise<{ contents: string; loader: 'js' }>,
  ): void
  onResolve(
    options: { filter: RegExp },
    callback: (args: {
      path: string
    }) => { path: string; namespace: string } | undefined,
  ): void
  onLoad(
    options: { filter: RegExp; namespace: string },
    callback: (args: {
      path: string
    }) => Promise<{ contents: string; loader: 'js' }>,
  ): void
}

/** An outputs module, optionally naming the outputs it provides so it loads only when asked for. */
export type TonedBunModule =
  | string
  | { module: string; provides: readonly string[] }

export interface TonedBunPluginOptions {
  /** Outputs modules, relative to `root`. Unnamed ones load in order until one provides the output. */
  modules: readonly TonedBunModule[]
  root?: string
}

/**
 * A Bun runtime plugin serving the same `toned:` specifiers to tests and
 * scripts. Register it from a preload with `Bun.plugin(tonedBunPlugin(...))`.
 * A module is imported only when one of its outputs is first loaded, and may
 * itself import other modules' outputs. `toned:<name>` loads the CSS as a
 * string, as `toned:<name>/css` does.
 */
export function tonedBunPlugin(options: TonedBunPluginOptions) {
  const root = resolve(options.root ?? process.cwd())
  const entries = options.modules.map((entry) =>
    typeof entry === 'string' ? { module: entry, provides: undefined } : entry,
  )
  const outputs: TonedOutputs = {}
  const loaded = new Map<number, Promise<void>>()
  const loading = new Set<number>()
  const load = (index: number): Promise<void> => {
    // Concurrent imports of one module's outputs share its load. (A module must
    // not import its own outputs: that load would wait on itself.)
    const existing = loaded.get(index)
    if (existing) return existing
    const { module } = entries[index]!
    loading.add(index)
    const promise = collectOutputs(
      [module],
      () => import(resolve(root, module)),
    )
      .then((collected) => void Object.assign(outputs, collected))
      .finally(() => loading.delete(index))
    loaded.set(index, promise)
    return promise
  }
  const outputNamed = async (name: string) => {
    const hinted = entries.findIndex((entry) => entry.provides?.includes(name))
    if (hinted >= 0) await load(hinted)
    for (let index = 0; !(name in outputs) && index < entries.length; index++)
      if (!entries[index]!.provides && !loading.has(index)) await load(index)
    return outputFor(outputs, name)
  }
  return {
    name: 'toned:outputs',
    setup(build: BunPluginBuilder) {
      build.onResolve({ filter: /^toned:/ }, ({ path }) =>
        parseOutputSpecifier(path) ? { path, namespace: 'toned' } : undefined,
      )
      // Bun's resolve hooks do not see dynamic `import()`, so the CSS and manifest of
      // every named output are also registered as modules, which it does.
      for (const name of entries.flatMap((entry) => entry.provides ?? []))
        for (const key of ['css', 'manifest'])
          build.module(`${OUTPUT_PREFIX}${name}/${key}`, async () => ({
            contents: outputModuleSource(await outputNamed(name), key),
            loader: 'js',
          }))
      build.onLoad({ filter: /.*/, namespace: 'toned' }, async ({ path }) => {
        // Bun reads `toned:` as this plugin's namespace, so the path may arrive without it.
        const specifier =
          parseOutputSpecifier(path) ??
          parseOutputSpecifier(`${OUTPUT_PREFIX}${path}`)
        if (!specifier) throw new Error(`not a Toned output specifier: ${path}`)
        const output = await outputNamed(specifier.name)
        return {
          contents: outputModuleSource(output, specifier.key ?? 'css'),
          loader: 'js',
        }
      })
    },
  }
}
