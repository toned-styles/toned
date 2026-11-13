import { basename, join, resolve } from 'node:path'

import type { InlineConfig, Plugin, ViteDevServer } from 'vite'

import { cssCachePath, writeOutputCache } from '../outputs/cache.ts'
import {
  type TonedOutput,
  outputModuleSource,
  parseOutputSpecifier,
  unknownOutputError,
} from '../outputs/index.ts'
import { createOutputsLoader } from '../outputs/runner.ts'

export interface TonedOutputsPluginOptions {
  /** Globs, relative to the Vite root, matching `<name>.toned.ts` output files. */
  outputs: readonly string[]
  /** Where CSS outputs are written for `@import`. Defaults to `<cacheDir>/toned`. */
  cacheDir?: string
  /** Extra Vite config for the runner that evaluates output files. */
  runner?: InlineConfig
}

/**
 * Serves Toned outputs to a Vite app: `@import 'toned:<name>'` in any stylesheet
 * (at any depth, with `layer(...)`), and `toned:<name>/<key>` from code. Outputs
 * are built when the build or dev server starts; in dev, editing any file an
 * output read rebuilds that output and the outputs that import it.
 */
export function tonedOutputs(options: TonedOutputsPluginOptions): Plugin {
  let root = process.cwd()
  let cacheDir = ''
  let loader: ReturnType<typeof createOutputsLoader> | undefined
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
    config(config) {
      root = resolve(config.root ?? process.cwd())
      cacheDir = resolve(
        root,
        options.cacheDir ?? join(config.cacheDir ?? 'node_modules/.vite', 'toned'),
      )
      // CSS `@import` resolves through aliases, not plugin hooks, so a bare
      // `toned:<name>` points at the output's file in the cache directory. The
      // alias's own resolver rejects a name no output declares, with the same
      // error code imports get, instead of a missing-file error.
      return {
        resolve: {
          alias: [
            {
              find: /^toned:([\w.-]+)$/,
              replacement: cssCachePath(cacheDir, '$1'),
              customResolver(path) {
                const name = basename(path).replace(/\.css$/, '')
                if (!outputs[name]) throw unknownOutputError(name, Object.keys(outputs))
                return path
              },
            },
          ],
        },
      }
    },
    async buildStart() {
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
      if (!output) throw unknownOutputError(specifier.name, Object.keys(outputs))
      return outputModuleSource(output, specifier.key)
    },
    configureServer(devServer) {
      server = devServer
      let running = Promise.resolve()
      devServer.watcher.on('change', file => {
        if (!loader || file.startsWith(cacheDir) || loader.invalidate(file).length === 0) return
        running = running
          .then(async () => reload(devServer, await collect()))
          .catch((error: unknown) => devServer.config.logger.error(String(error)))
      })
    },
  }
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
