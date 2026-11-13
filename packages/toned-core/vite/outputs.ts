import { basename, join, resolve } from 'node:path'

import type { InlineConfig, Plugin, ViteDevServer } from 'vite'

import { cssCachePath, writeOutputCache } from '../outputs/cache.ts'
import { declaredOutputs } from '../outputs/discover.ts'
import {
  type TonedOutput,
  outputFile,
  outputModuleSource,
  outputName,
  parseOutputSpecifier,
} from '../outputs/index.ts'
import { type OutputsLoader, createOutputsLoader } from '../outputs/runner.ts'

export interface TonedOutputsPluginOptions {
  /**
   * Globs, relative to the Vite root, matching `<name>.toned.ts` output files.
   * Without them, the outputs the packages reachable from the root declare
   * (`"toned": { "outputs": [...] }` in package.json).
   */
  outputs?: readonly string[]
  /** Where CSS outputs are written for `@import`. Defaults to `<cacheDir>/toned`. */
  cacheDir?: string
  /** Extra Vite config for the runner that evaluates output files. */
  runner?: InlineConfig
}

/**
 * Serves Toned outputs to a Vite app: `@import 'toned:<name>'` in any stylesheet
 * (at any depth, with `layer(...)`), and `toned:<name>/<key>` from code. Outputs
 * are built when the build or dev server starts, once for every environment of
 * one build. In dev, editing any file an output read (or declared as an input)
 * rebuilds that output and the outputs that import it, adding or deleting an
 * output file is picked up, and a failed rebuild shows in the error overlay.
 */
export function tonedOutputs(options: TonedOutputsPluginOptions = {}): Plugin {
  let root = process.cwd()
  let cacheDir = ''
  let loader: OutputsLoader | undefined
  let outputs: Record<string, TonedOutput> = {}
  let server: ViteDevServer | undefined
  const collect = async () => {
    loader ??= createOutputsLoader({ outputs: options.outputs, root, runner: options.runner })
    outputs = await loader.loadAll()
    // In dev, watch exactly the files the outputs read.
    server?.watcher.add(loader.watchedFiles())
    return writeOutputCache(cacheDir, outputs)
  }

  return {
    name: 'toned:outputs',
    enforce: 'pre',
    // One instance, so one set of outputs, for every environment of a build.
    sharedDuringBuild: true,
    config(config) {
      root = resolve(config.root ?? process.cwd())
      cacheDir = resolve(
        root,
        options.cacheDir ?? join(config.cacheDir ?? 'node_modules/.vite', 'toned'),
      )
      // CSS `@import` resolves through aliases, not plugin hooks, so a bare
      // `toned:<name>` points at the output's file in the cache directory.
      return {
        resolve: {
          alias: [{ find: /^toned:([\w.-]+)$/, replacement: cssCachePath(cacheDir, '$1') }],
        },
      }
    },
    async buildStart() {
      // A later build by the same plugin sees edits; the next environment of
      // this build finds nothing changed and reuses what is loaded.
      await loader?.refresh()
      await collect()
    },
    resolveId(id) {
      if (parseOutputSpecifier(id)?.key) return `\0${id}`
    },
    load(id) {
      if (!id.startsWith('\0toned:')) return
      const specifier = parseOutputSpecifier(id.slice(1))
      if (!specifier?.key) return
      const output = outputs[specifier.name]
      // Not an output: say which there are.
      if (!output) outputFile(loader?.files ?? {}, specifier.name)
      return outputModuleSource(output ?? {}, specifier.key, specifier.name)
    },
    configureServer(devServer) {
      server = devServer
      let running = Promise.resolve()
      const rebuild = (stale: boolean, everything = false) => {
        if (!stale) return
        running = running
          .then(async () => {
            const changed = await collect()
            if (everything) invalidateAll(devServer)
            reload(devServer, changed)
          })
          .catch((error: unknown) => {
            devServer.config.logger.error(String(error))
            const { message, stack } = error instanceof Error ? error : new Error(String(error))
            devServer.ws.send({ type: 'error', err: { message, stack: stack ?? '', plugin: 'toned:outputs' } })
          })
      }
      const owned = (file: string) => !file.startsWith(cacheDir) && !!loader
      devServer.watcher.on('change', file => {
        if (owned(file)) rebuild((loader as OutputsLoader).invalidate(file).length > 0)
      })
      // A new or deleted output file changes the set of outputs.
      const moved = (file: string) => {
        if (owned(file) && outputName(file)) rebuild((loader as OutputsLoader).rediscover(), true)
      }
      devServer.watcher.on('add', moved)
      devServer.watcher.on('unlink', moved)
      // Outputs declared by packages outside the root are watched too.
      if (!options.outputs)
        devServer.watcher.add(declaredOutputs(root).map(declaration => declaration.dir))
    },
  }
}

/** Every served `toned:` module, once the set of outputs changed: a deleted one must not linger. */
function invalidateAll(server: ViteDevServer) {
  for (const [id, module] of server.moduleGraph.idToModuleMap)
    if (id.startsWith('\0toned:')) void server.reloadModule(module)
}

/** Hand changed outputs to Vite's own update path: CSS files, and the data modules that changed. */
function reload(server: ViteDevServer, changed: readonly string[]) {
  for (const file of changed) {
    if (file.endsWith('.css')) {
      server.watcher.emit('change', file)
      continue
    }
    // `<cache>/<name>.<key>.js` is the cached copy of `toned:<name>/<key>`.
    const [, name, key] = /([\w.-]+)\.([\w-]+)\.js$/.exec(basename(file)) ?? []
    const module = server.moduleGraph.getModuleById(`\0toned:${name}/${key}`)
    if (module) void server.reloadModule(module)
  }
}
