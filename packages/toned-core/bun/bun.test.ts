import {
  mkdir,
  mkdtemp,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, test } from 'vitest'

import { tonedBunPlugin } from './index.ts'

const dirs: string[] = []
afterEach(async () => {
  for (const dir of dirs.splice(0))
    await rm(dir, { recursive: true, force: true })
})

async function tempDir(files: Record<string, string> = {}) {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'toned-bun-')))
  dirs.push(dir)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(dir, path, '..'), { recursive: true })
    await writeFile(join(dir, path), content)
  }
  return dir
}

const outputFile = (css: string) =>
  `export default { css: ${JSON.stringify(css)}, manifest: { systemId: 'demo' } }\n`

/** The modules a plugin registers, as one process would see them. */
function register(plugin: ReturnType<typeof tonedBunPlugin>) {
  const modules = new Map<string, () => Promise<{ contents: string }>>()
  plugin.setup({
    module: (specifier, callback) => modules.set(specifier, callback),
    onResolve: () => {},
    onLoad: () => {},
  })
  return async (specifier: string) => {
    const load = modules.get(specifier)
    if (!load) throw new Error(`not registered: ${specifier}`)
    return (await load()).contents
  }
}

test('without a cache directory, a process builds the output from its file', async () => {
  const root = await tempDir({
    'demo.toned.ts': outputFile('.a { color: red }'),
  })
  const load = register(tonedBunPlugin({ outputs: ['*.toned.ts'], root }))
  expect(await load('toned:demo/css')).toContain('.a { color: red }')
  expect(await load('toned:demo/manifest')).toContain('"systemId":"demo"')
})

test('processes sharing a cache directory build an output once and read it after', async () => {
  const cacheDir = await tempDir()
  const first = await tempDir({ 'demo.toned.ts': outputFile('.first {}') })
  // A second process whose output file would build differently: it must serve
  // what the first one built, so it never ran its own build.
  const second = await tempDir({ 'demo.toned.ts': outputFile('.second {}') })

  const one = register(
    tonedBunPlugin({ outputs: ['*.toned.ts'], root: first, cacheDir }),
  )
  expect(await one('toned:demo/css')).toContain('.first {}')

  const two = register(
    tonedBunPlugin({ outputs: ['*.toned.ts'], root: second, cacheDir }),
  )
  expect(await two('toned:demo/css')).toContain('.first {}')
  expect(await two('toned:demo/manifest')).toContain('"systemId":"demo"')
  // Written whole, never a partial file another process could read.
  expect(
    (await readdir(cacheDir)).filter((name) => name.endsWith('.tmp')),
  ).toEqual([])
})
