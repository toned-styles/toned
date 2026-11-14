import {
  mkdir,
  mkdtemp,
  readFile,
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

/** The modules a plugin serves, as one process would load them. */
function register(plugin: ReturnType<typeof tonedBunPlugin>) {
  const loads: ((args: { path: string }) => Promise<{ contents: string }>)[] = []
  plugin.setup({
    onResolve: () => {},
    onLoad: (_, callback) => void loads.push(callback),
  })
  return async (specifier: string) => {
    // Bun reads `toned:` as the plugin's namespace and hands over the rest.
    const load = loads[0]
    if (!load) throw new Error(`not served: ${specifier}`)
    return (await load({ path: specifier.slice('toned:'.length) })).contents
  }
}

/** An output that appends to `builds.log` each time it is built. */
const loggedOutput = (css: string) =>
  `import { appendFileSync } from 'node:fs'\nappendFileSync(new URL('./builds.log', import.meta.url), 'x')\nexport default { css: ${JSON.stringify(css)}, data: { tokens: { gap: [1, 2] } } }\n`

test('a process builds an output from its file, and serves every data key', async () => {
  const root = await tempDir({
    'demo.toned.ts': outputFile('.a { color: red }'),
    'other.toned.ts': "export default { data: { tokens: { gap: [1, 2] } } }\n",
  })
  const load = register(tonedBunPlugin({ outputs: ['*.toned.ts'], root }))
  expect(await load('toned:demo/css')).toContain('.a { color: red }')
  expect(await load('toned:demo')).toContain('.a { color: red }')
  expect(await load('toned:demo/manifest')).toContain('"systemId":"demo"')
  expect(await load('toned:other/tokens')).toBe('export default {"gap":[1,2]}\n')
  await expect(load('toned:nope/css')).rejects.toThrow(
    'toned:nope is not a Toned output; the outputs are: demo, other',
  )
  await expect(load('toned:other/missing')).rejects.toThrow(
    'toned:other has no "missing"; it has: css, tokens',
  )
})

test('an output is evaluated in its own module graph, not the process importing it', async () => {
  const root = await tempDir({
    'state.ts': "export const state = { value: 'fresh' }\n",
    'demo.toned.ts':
      "import { state } from './state.ts'\nexport default { css: `.${state.value} {}` }\n",
  })
  // The process already imported the module and changed it.
  const { state } = (await import(join(root, 'state.ts'))) as { state: { value: string } }
  state.value = 'changed'
  const load = register(tonedBunPlugin({ outputs: ['*.toned.ts'], root }))
  expect(await load('toned:demo/css')).toContain('.fresh {}')
})

test('processes sharing a cache directory build an output once, until one of its files changes', async () => {
  const cacheDir = await tempDir()
  const root = await tempDir({
    'demo.toned.ts': loggedOutput('.first {}'),
  })
  const builds = async () =>
    (await readFile(join(root, 'builds.log'), 'utf8').catch(() => '')).length
  const process = () =>
    register(tonedBunPlugin({ outputs: ['*.toned.ts'], root, cacheDir }))

  expect(await process()('toned:demo/css')).toContain('.first {}')
  // A second process reads what the first built.
  expect(await process()('toned:demo/tokens')).toContain('"gap":[1,2]')
  expect(await builds()).toBe(1)
  // Written whole, never a partial file another process could read.
  expect(
    (await readdir(cacheDir)).filter((name) => name.endsWith('.tmp')),
  ).toEqual([])

  // An edited source makes the entry stale: the next process builds again.
  await writeFile(join(root, 'demo.toned.ts'), loggedOutput('.second {}'))
  expect(await process()('toned:demo/css')).toContain('.second {}')
  expect(await builds()).toBe(2)
})

test('a cache directory never serves one root\'s output to another', async () => {
  const cacheDir = await tempDir()
  const first = await tempDir({ 'demo.toned.ts': outputFile('.first {}') })
  const second = await tempDir({ 'demo.toned.ts': outputFile('.second {}') })
  const load = (root: string) =>
    register(tonedBunPlugin({ outputs: ['*.toned.ts'], root, cacheDir }))('toned:demo/css')
  expect(await load(first)).toContain('.first {}')
  expect(await load(second)).toContain('.second {}')
})

// Bun keeps every module a namespace `onLoad` hook served, with the realm that
// loaded it, for the life of the process. Under `bun test --isolate` that is
// every test file's whole module graph: HQ's DOM suite grew to 15.5 GB and
// stalled on a 16 GB CI runner. Modules registered with `build.module` are not
// kept that way, so every key the plugin can name is served through it.
test('known outputs and every cached data key are served as registered modules', async () => {
  const root = await tempDir({
    'demo.toned.ts': outputFile('.a {}'),
    'other.toned.ts': "export default { data: { tokens: { gap: [1, 2] } } }\n",
  })
  const cacheDir = await tempDir()
  // A first process builds `other` and caches it.
  await register(tonedBunPlugin({ outputs: ['*.toned.ts'], root, cacheDir }))('toned:other/tokens')

  // The next process (another isolated test file) registers its modules.
  const modules = new Map<string, () => Promise<{ contents: string }>>()
  tonedBunPlugin({ outputs: ['*.toned.ts'], root, cacheDir }).setup({
    module: (specifier, callback) => void modules.set(specifier, callback),
    onResolve: () => {},
    onLoad: () => {},
  })
  expect([...modules.keys()].sort()).toEqual([
    'toned:demo',
    'toned:demo/css',
    'toned:demo/manifest',
    'toned:other',
    'toned:other/css',
    'toned:other/tokens',
  ])
  expect((await modules.get('toned:other/tokens')!()).contents).toBe(
    'export default {"gap":[1,2]}\n',
  )
  expect((await modules.get('toned:demo')!()).contents).toContain('.a {}')
})

// Merely registering hooks in a namespace makes Bun keep each isolated test
// file's realm (measured: HQ's DOM suite stalls at 15.5 GB with them, finishes at
// 10.4 GB without). When every output is cached, every key is a registered
// module, so the plugin registers no namespace hooks at all.
test('with every output cached, no namespace hooks are registered', async () => {
  const root = await tempDir({
    'demo.toned.ts': outputFile('.a {}'),
    'other.toned.ts': "export default { data: { tokens: { gap: [1, 2] } } }\n",
  })
  const cacheDir = await tempDir()
  const first = register(tonedBunPlugin({ outputs: ['*.toned.ts'], root, cacheDir }))
  await first('toned:demo/css')
  await first('toned:other/tokens')

  const hooks: string[] = []
  const modules: string[] = []
  tonedBunPlugin({ outputs: ['*.toned.ts'], root, cacheDir }).setup({
    module: (specifier) => void modules.push(specifier),
    onResolve: (options) => void hooks.push(`resolve ${options.namespace ?? '-'}`),
    onLoad: (options) => void hooks.push(`load ${options.namespace}`),
  })
  expect(hooks).toEqual([])
  expect(modules).toContain('toned:other/tokens')
})
