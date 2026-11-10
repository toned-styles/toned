import { basename, join, resolve } from 'node:path'

import type { InlineConfig, Plugin, ViteDevServer } from 'vite'

import { cssCachePath, writeOutputCache } from '../outputs/cache.ts'
import type { TonedOutputs } from '../outputs/index.ts'
import { loadOutputs, outputsModulePlugin } from '../outputs/runner.ts'

export interface TonedOutputsPluginOptions {
  /** Outputs modules, relative to the Vite root, collected in order. */
  modules: readonly string[]
  /** Files or directories (relative to the root) whose changes recollect in dev. */
  watch?: readonly string[]
  /** Where CSS outputs are written for `@import`. Defaults to `<cacheDir>/toned`. */
  cacheDir?: string
  /** Extra Vite config for the runner that evaluates the modules. */
  runner?: InlineConfig
}

/**
 * Serves named Toned outputs to a Vite app: `@import 'toned:<name>'` in any
 * stylesheet (at any depth, with `layer(...)`), and `toned:<name>/<key>` from code.
 * Nothing is committed: outputs are collected when the build or dev server
 * starts, and again in dev when a watched file changes.
 */
export function tonedOutputs(options: TonedOutputsPluginOptions): Plugin {
  let root = process.cwd()
  let cacheDir = ''
  let outputs: TonedOutputs = {}
  const collect = async () => {
    outputs = await loadOutputs({
      modules: options.modules,
      root,
      runner: options.runner,
    })
    return writeOutputCache(cacheDir, outputs)
  }
  const modules = outputsModulePlugin(() => outputs)

  return {
    name: 'toned:outputs',
    enforce: 'pre',
    config(config) {
      root = resolve(config.root ?? process.cwd())
      cacheDir = resolve(
        root,
        options.cacheDir ??
          join(config.cacheDir ?? 'node_modules/.vite', 'toned'),
      )
      // CSS `@import` resolves through aliases, not plugin hooks, so a bare
      // `toned:<name>` points at the output's file in the cache directory.
      return {
        resolve: {
          alias: [
            {
              find: /^toned:([\w.-]+)$/,
              replacement: cssCachePath(cacheDir, '$1'),
            },
          ],
        },
      }
    },
    async buildStart() {
      await collect()
    },
    resolveId: modules.resolveId,
    load: modules.load,
    configureServer(server) {
      const watched = (options.watch ?? []).map((path) => resolve(root, path))
      if (watched.length === 0) return
      server.watcher.add(watched)
      let timer: ReturnType<typeof setTimeout> | undefined
      let running = Promise.resolve()
      const recollect = () => {
        running = running
          .then(async () => reload(server, await collect()))
          .catch((error: unknown) => server.config.logger.error(String(error)))
      }
      server.watcher.on('change', (file) => {
        if (
          file.startsWith(cacheDir) ||
          !watched.some((path) => file.startsWith(path))
        )
          return
        clearTimeout(timer)
        timer = setTimeout(recollect, 50)
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
