import { mkdir, mkdtemp, realpath, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build, createBuilder, createServer, type ViteDevServer } from 'vite'
import { afterEach, expect, test, vi } from 'vitest'

import { tonedOutputs } from './index.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function project(files: Record<string, string>) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-vite-outputs-')))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}

const wait = (ms: number) => new Promise(done => setTimeout(done, ms))
async function until(check: () => Promise<boolean> | boolean, tries = 60) {
  for (let i = 0; i < tries; i++) {
    if (await check()) return
    await wait(100)
  }
  throw new Error('timed out')
}

/** An output file that counts its builds in this process. */
const counted = (css: string) =>
  `const g = globalThis as { tonedBuilds?: number }\ng.tonedBuilds = (g.tonedBuilds ?? 0) + 1\nexport default { css: ${JSON.stringify(css)}, data: { ok: true } }\n`

async function devServer(root: string, plugin = tonedOutputs({ outputs: ['*.toned.ts'] })) {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [plugin],
  })
  await server.listen()
  return server
}
const served = async (server: ViteDevServer, id: string) =>
  (await server.transformRequest(id).catch(() => undefined))?.code ?? ''

test('vite build with several environments, from a config file, builds each output once', async () => {
  const plugin = fileURLToPath(new URL('./index.ts', import.meta.url))
  const root = await project({
    'vite.config.ts': `import { tonedOutputs } from ${JSON.stringify(plugin)}
export default {
  logLevel: 'silent',
  plugins: [tonedOutputs({ outputs: ['*.toned.ts'] })],
  builder: {},
  environments: {
    client: { build: { write: false, rollupOptions: { input: 'entry.js' } } },
    ssr: { build: { write: false, ssr: true, rollupOptions: { input: 'entry.js' } } },
  },
}
`,
    'entry.js': "import ok from 'toned:demo/ok'\nconsole.log(ok)\n",
    'demo.toned.ts': counted('.demo {}'),
  })
  const g = globalThis as { tonedBuilds?: number }
  g.tonedBuilds = 0
  const builder = await createBuilder({ root, configFile: join(root, 'vite.config.ts') })
  await builder.buildApp()
  expect(Object.keys(builder.environments).toSorted()).toEqual(['client', 'ssr'])
  expect(g.tonedBuilds).toBe(1)
})

test('one plugin reused for a second build rebuilds only what changed', async () => {
  const root = await project({
    'index.html': '<script type="module" src="/entry.js"></script>',
    'entry.js': "import ok from 'toned:demo/ok'\nconsole.log(ok)\n",
    'demo.toned.ts': counted('.demo {}'),
  })
  const g = globalThis as { tonedBuilds?: number }
  g.tonedBuilds = 0
  const plugin = tonedOutputs({ outputs: ['*.toned.ts'] })
  const compile = () =>
    build({ root, configFile: false, logLevel: 'silent', plugins: [plugin], build: { write: false } })
  await compile()
  await compile()
  expect(g.tonedBuilds).toBe(1)
  await writeFile(join(root, 'demo.toned.ts'), counted('.changed {}'))
  await compile()
  expect(g.tonedBuilds).toBe(2)
})

test('an unknown output name fails with the outputs there are', async () => {
  const root = await project({
    'index.html': '<script type="module" src="/entry.js"></script>',
    'entry.js': "import manifest from 'toned:nope/manifest'\nconsole.log(manifest)\n",
    'demo.toned.ts': "export default { css: '' }\n",
  })
  await expect(
    build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: [tonedOutputs({ outputs: ['*.toned.ts'] })],
      build: { write: false },
    }),
  ).rejects.toThrow('toned:nope is not a Toned output; the outputs are: demo')
})

test('without globs, the plugin serves the outputs the package declares', async () => {
  const root = await project({
    'package.json': JSON.stringify({ name: 'app', toned: { outputs: ['styles/*.toned.ts'] } }),
    'styles/declared.toned.ts': "export default { css: '.declared {}' }\n",
  })
  const server = await devServer(root, tonedOutputs())
  try {
    expect(await served(server, 'toned:declared/css')).toContain('.declared {}')
  } finally {
    await server.close()
  }
})

test('in dev, a new output file is served and a deleted one is gone, without a restart', async () => {
  const root = await project({ 'one.toned.ts': "export default { css: '.one {}' }\n" })
  const server = await devServer(root)
  try {
    expect(await served(server, 'toned:one/css')).toContain('.one {}')
    await writeFile(join(root, 'two.toned.ts'), "export default { css: '.two {}' }\n")
    await until(async () => (await served(server, 'toned:two/css')).includes('.two {}'))
    await unlink(join(root, 'one.toned.ts'))
    await until(async () => {
      const error = await server.transformRequest('toned:one/css').then(
        () => '',
        (e: Error) => e.message,
      )
      return error.includes('toned:one is not a Toned output; the outputs are: two')
    })
  } finally {
    await server.close()
  }
}, 15_000)

test('in dev, editing a declared input rebuilds the output, and a failed rebuild reaches the error overlay', async () => {
  const root = await project({
    'notes.txt': 'first',
    'site.toned.ts':
      "import { readFileSync } from 'node:fs'\nconst notes = new URL('./notes.txt', import.meta.url)\nconst text = readFileSync(notes, 'utf8')\nif (text === 'broken') throw new Error('notes are broken')\nexport default { css: `.${text} {}`, inputs: [notes] }\n",
  })
  const server = await devServer(root)
  const send = vi.spyOn(server.ws, 'send')
  try {
    expect(await served(server, 'toned:site/css')).toContain('.first {}')
    await writeFile(join(root, 'notes.txt'), 'second')
    await until(async () => (await served(server, 'toned:site/css')).includes('.second {}'))
    await writeFile(join(root, 'notes.txt'), 'broken')
    await until(() =>
      send.mock.calls.some(([payload]) => {
        const p = payload as { type?: string; err?: { message?: string; plugin?: string } }
        return p.type === 'error' && !!p.err?.message?.includes('notes are broken') && p.err.plugin === 'toned:outputs'
      }),
    )
  } finally {
    await server.close()
  }
}, 15_000)

test('in dev, an output that is broken at start does not stop the server, and fixing it serves it', async () => {
  const root = await project({
    'good.toned.ts': "export default { css: '.good {}' }\n",
    'bad.toned.ts': "export default { CSS: '.bad {}' }\n",
  })
  const server = await devServer(root)
  try {
    expect(await served(server, 'toned:good/css')).toContain('.good {}')
    await expect(server.transformRequest('toned:bad/css')).rejects.toThrow('did you mean "css"?')
    await writeFile(join(root, 'bad.toned.ts'), "export default { css: '.fixed {}' }\n")
    await until(async () => (await served(server, 'toned:bad/css')).includes('.fixed {}'))
  } finally {
    await server.close()
  }
}, 15_000)
