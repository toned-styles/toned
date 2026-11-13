/**
 * A Bun preload that serves Toned outputs with no hand-written setup:
 *
 *   bun --preload @toned/core/bun/register script.ts
 *
 * or `preload = ["@toned/core/bun/register"]` in bunfig.toml. The outputs are the
 * ones the packages reachable from the working directory declare in package.json
 * (`"toned": { "outputs": [...] }`). Built outputs are kept in
 * `node_modules/.cache/toned/bun` (or `TONED_OUTPUTS_CACHE`) and reused while
 * every file they read is unchanged, so only the first process pays for a build.
 */
import { join } from 'node:path'

import { tonedBunPlugin } from './index.ts'

declare const Bun: { plugin(plugin: ReturnType<typeof tonedBunPlugin>): void }

const root = process.cwd()
Bun.plugin(
  tonedBunPlugin({
    root,
    cacheDir: process.env['TONED_OUTPUTS_CACHE'] || join(root, 'node_modules/.cache/toned/bun'),
  }),
)
