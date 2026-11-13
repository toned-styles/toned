/**
 * A Bun preload that serves Toned outputs with no hand-written setup:
 *
 *   bun --preload @toned/core/bun/register script.ts
 *
 * or `preload = ["@toned/core/bun/register"]` in bunfig.toml. The outputs are the
 * ones the packages reachable from the working directory declare in package.json
 * (`"toned": { "outputs": [...] }`). Set `TONED_OUTPUTS_CACHE` to a directory to
 * share built outputs between the processes of a run.
 */
import { tonedBunPlugin } from './index.ts'

declare const Bun: { plugin(plugin: ReturnType<typeof tonedBunPlugin>): void }

Bun.plugin(
  tonedBunPlugin({
    root: process.cwd(),
    ...(process.env['TONED_OUTPUTS_CACHE'] ? { cacheDir: process.env['TONED_OUTPUTS_CACHE'] } : {}),
  }),
)
