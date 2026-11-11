import { execFileSync } from 'node:child_process'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { InlineConfig } from 'vite'

import { cssCachePath, moduleCachePath, writeOutputCache } from '../outputs/cache.ts'
import { outputFile, parseOutputSpecifier } from '../outputs/index.ts'
import { createOutputsLoader } from '../outputs/runner.ts'

type Resolution = { type: 'sourceFile'; filePath: string } | { type: string; [key: string]: unknown }
type ResolveRequest = (
  context: { resolveRequest: ResolveRequest; [key: string]: unknown },
  moduleName: string,
  platform: string | null,
) => Resolution

interface MetroLikeConfig {
  projectRoot?: string
  watchFolders?: readonly string[]
  resolver?: { resolveRequest?: ResolveRequest | null; [key: string]: unknown }
  [key: string]: unknown
}

export interface TonedMetroOptions {
  /** Globs, relative to `root`, matching `<name>.toned.ts` output files. */
  outputs: readonly string[]
  /** What `outputs` and `cacheDir` are relative to. Defaults to the config's project root. */
  root?: string
  /** Where outputs are written for Metro to read. Defaults to `node_modules/.cache/toned`. */
  cacheDir?: string
  /** Extra Vite config for the runner that evaluates output files. */
  runner?: InlineConfig
}

type WithResolver<C> = C & { resolver: { resolveRequest: ResolveRequest } }

/**
 * Add Toned outputs to a Metro config: `toned:<name>` resolves to the output's
 * CSS and `toned:<name>/<key>` to its data, both written to a cache directory
 * when the config loads. Restart Metro to rebuild changed declarations.
 */
export async function withTonedOutputs<C extends MetroLikeConfig>(
  config: C,
  options: TonedMetroOptions,
): Promise<WithResolver<C>> {
  const { root, cacheDir } = locations(config, options)
  const loader = createOutputsLoader({ outputs: options.outputs, root, runner: options.runner })
  await writeOutputCache(cacheDir, await loader.loadAll())
  return withResolver(config, cacheDir, loader.names)
}

/**
 * The same, for a Metro config that must be synchronous: the outputs are built in
 * a child Node process (Vite's module runner is asynchronous).
 */
export function withTonedOutputsSync<C extends MetroLikeConfig>(
  config: C,
  options: TonedMetroOptions,
): WithResolver<C> {
  const { root, cacheDir } = locations(config, options)
  const collector = fileURLToPath(new URL('./collect.ts', import.meta.url))
  const names = execFileSync(
    process.execPath,
    [collector, JSON.stringify({ root, outputs: options.outputs, cacheDir, runner: options.runner })],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  )
  return withResolver(config, cacheDir, JSON.parse(names) as string[])
}

function locations(config: MetroLikeConfig, options: TonedMetroOptions) {
  const root = resolve(options.root ?? config.projectRoot ?? process.cwd())
  return { root, cacheDir: resolve(root, options.cacheDir ?? 'node_modules/.cache/toned') }
}

function withResolver<C extends MetroLikeConfig>(
  config: C,
  cacheDir: string,
  names: readonly string[],
): WithResolver<C> {
  const known = Object.fromEntries(names.map(name => [name, name]))
  const next = config.resolver?.resolveRequest
  const resolveRequest: ResolveRequest = (context, moduleName, platform) => {
    const specifier = parseOutputSpecifier(moduleName)
    if (!specifier) return (next ?? context.resolveRequest)(context, moduleName, platform)
    outputFile(known, specifier.name)
    return {
      type: 'sourceFile',
      filePath: specifier.key
        ? moduleCachePath(cacheDir, specifier.name, specifier.key)
        : cssCachePath(cacheDir, specifier.name),
    }
  }
  // Metro serves only files under the project root or a watch folder.
  const watched = [config.projectRoot, ...(config.watchFolders ?? [])].filter(
    (folder): folder is string => typeof folder === 'string',
  )
  const covered = watched.some(folder => !relative(resolve(folder), cacheDir).startsWith('..'))
  return {
    ...config,
    watchFolders: covered
      ? [...(config.watchFolders ?? [])]
      : [...(config.watchFolders ?? []), cacheDir],
    resolver: { ...config.resolver, resolveRequest },
  }
}
