import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { type TonedOutput, outputModuleSource } from './index.ts'

/** Where an output's CSS lives in a cache directory. */
export const cssCachePath = (cacheDir: string, name: string) =>
  join(cacheDir, `${name}.css`)
/** Where an output's `toned:<name>/<key>` module lives in a cache directory. */
export const moduleCachePath = (cacheDir: string, name: string, key: string) =>
  join(cacheDir, `${name}.${key}.js`)

/** Each output's module keys: `css` and its data keys. */
export const outputKeys = (
  outputs: Readonly<Record<string, TonedOutput>>,
): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(outputs).map(([name, output]) => [
      name,
      ['css', ...Object.keys(output.data ?? {})],
    ]),
  )

async function writeIfChanged(path: string, content: string): Promise<boolean> {
  if ((await readFile(path, 'utf8').catch(() => undefined)) === content)
    return false
  await writeFile(path, content)
  return true
}

/**
 * Write outputs into a cache directory so resolvers that need a real file (CSS
 * `@import`, Metro) can reach them. Unchanged files keep their mtimes. Returns the
 * paths that changed.
 */
export async function writeOutputCache(
  cacheDir: string,
  outputs: Readonly<Record<string, TonedOutput>>,
): Promise<string[]> {
  await mkdir(cacheDir, { recursive: true })
  const changed: string[] = []
  for (const [name, output] of Object.entries(outputs)) {
    const files: [string, string][] = [
      [cssCachePath(cacheDir, name), output.css ?? ''],
    ]
    for (const key of outputKeys({ [name]: output })[name] ?? [])
      files.push([
        moduleCachePath(cacheDir, name, key),
        outputModuleSource(output, key),
      ])
    for (const [path, content] of files)
      if (await writeIfChanged(path, content)) changed.push(path)
  }
  return changed
}
