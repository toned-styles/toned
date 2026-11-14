import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { build, createServer } from 'vite'
import { afterEach, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { withTonedOutputs, withTonedOutputsSync } from '../metro/index.ts'
import { defineSystem } from '../system/definers.ts'
import { tonedOutputs } from '../vite/index.ts'
import {
  defineOutput,
  outputModuleSource,
  outputName,
  parseOutputSpecifier,
  toOutput,
} from './index.ts'
import { createOutputsLoader } from './runner.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function project(files: Record<string, string>) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-outputs-')))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}

async function compile(root: string, plugin: ReturnType<typeof tonedOutputs>) {
  const result = await build({
    root,
    configFile: false,
    logLevel: 'silent',
    plugins: [plugin],
    build: { write: false, minify: false, cssMinify: false },
  })
  if (Array.isArray(result) || !('output' in result)) throw new Error('Expected one build')
  const asset = (ext: string) =>
    result.output
      .filter(file => file.fileName.endsWith(ext))
      .map(file => ('source' in file ? String(file.source) : file.code))
      .join('\n')
  return { css: asset('.css'), js: asset('.js') }
}

const html = '<script type="module" src="/entry.js"></script>'
const wait = (ms: number) => new Promise(done => setTimeout(done, ms))

test('a nested stylesheet imports an output into its own layer, and code imports its manifest', async () => {
  const root = await project({
    'index.html': html,
    'entry.js':
      "import './app.css'\nimport manifest from 'toned:demo/manifest'\nconsole.log('id=' + manifest.systemId)",
    'app.css': "@layer base, components;\n@import './pkg/kit.css';\n.app { color: red }\n",
    'pkg/kit.css': "@import 'toned:demo' layer(components);\n",
    // A build artifact as `buildStyles` returns it.
    'styles/demo.toned.ts':
      "export default { css: '.from-toned { color: blue }', manifest: { systemId: 'demo-system' } }\n",
  })
  const { css, js } = await compile(root, tonedOutputs({ outputs: ['styles/*.toned.ts'] }))
  expect(css).toMatch(/@layer base, components;\s*@layer components\s*\{\s*\.from-toned/)
  expect(css.indexOf('.from-toned')).toBeLessThan(css.indexOf('.app'))
  expect(js).toContain('demo-system')
})

test('an output reads another output, and every build loads the sources fresh', async () => {
  const root = await project({
    'index.html': html,
    'entry.js': "import './app.css'",
    'app.css': "@import 'toned:site';\n",
    'usage.ts': "export const used = 'first'\n",
    'inventory.toned.ts':
      "import { used } from './usage.ts'\nexport default { data: { usage: [used] } }\n",
    'site.toned.ts':
      "import usage from 'toned:inventory/usage'\nexport default { css: `.used-${usage[0]} { color: blue }` }\n",
  })
  const plugin = () => tonedOutputs({ outputs: ['*.toned.ts'] })
  expect((await compile(root, plugin())).css).toContain('.used-first')
  await writeFile(join(root, 'usage.ts'), "export const used = 'second'\n")
  const updated = (await compile(root, plugin())).css
  expect(updated).toContain('.used-second')
  expect(updated).not.toContain('.used-first')
})

test('in dev, editing a file an output read rebuilds it and the outputs importing it', async () => {
  const root = await project({
    'usage.ts': "export const used = 'first'\n",
    'inventory.toned.ts':
      "import { used } from './usage.ts'\nexport default { data: { usage: [used] } }\n",
    'site.toned.ts':
      "import usage from 'toned:inventory/usage'\nexport default { css: `.used-${usage[0]} {}` }\n",
  })
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  expect((await loader.load('site')).css).toBe('.used-first {}')
  expect(loader.watchedFiles()).toContain(join(root, 'usage.ts'))
  expect(loader.invalidate(join(root, 'usage.ts')).toSorted()).toEqual(['inventory', 'site'])

  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { port: 0, host: '127.0.0.1' },
    plugins: [tonedOutputs({ outputs: ['*.toned.ts'] })],
  })
  await server.listen()
  try {
    // The module `import css from 'toned:site/css'` loads, as the browser requests it.
    const served = async () =>
      (await server.transformRequest('toned:site/css'))?.code ?? ''
    expect(await served()).toContain('used-first')
    await writeFile(join(root, 'usage.ts'), "export const used = 'second'\n")
    let code = ''
    for (let i = 0; i < 50 && !code.includes('used-second'); i++) {
      await wait(100)
      code = await served()
    }
    expect(code).toContain('used-second')
  } finally {
    await server.close()
  }
})

test('an unknown output imported from CSS is a build error naming the outputs there are', async () => {
  const root = await project({
    'index.html': html,
    'entry.js': "import './app.css'",
    'app.css': "@import 'toned:missing';\n",
    'demo.toned.ts': "export default { css: '' }\n",
  })
  await expect(compile(root, tonedOutputs({ outputs: ['*.toned.ts'] }))).rejects.toThrow(
    'toned:missing is not a Toned output; the outputs are: demo',
  )
})

test('an unknown output imported from code is a build error naming the outputs there are', async () => {
  const root = await project({
    'index.html': html,
    'entry.js': "import manifest from 'toned:nope/manifest'\nconsole.log(manifest)",
    'demo.toned.ts': "export default { css: '', manifest: {} }\n",
  })
  await expect(compile(root, tonedOutputs({ outputs: ['*.toned.ts'] }))).rejects.toThrow(
    'toned:nope is not a Toned output; the outputs are: demo',
  )
})

test('names come from files, and specifiers name an output and one of its entries', () => {
  expect(outputName('/a/lib/daylight.toned.ts')).toBe('daylight')
  expect(outputName('/a/lib/daylight-palette.toned.tsx')).toBe('daylight-palette')
  expect(outputName('/a/lib/styles.ts')).toBeUndefined()
  expect(parseOutputSpecifier('toned:daylight')).toEqual({ name: 'daylight' })
  expect(parseOutputSpecifier('toned:daylight/manifest')).toEqual({
    name: 'daylight',
    key: 'manifest',
  })
  expect(parseOutputSpecifier('./toned.css')).toBeUndefined()
  expect(toOutput({ default: { css: '.a{}', manifest: { a: 1 } } }, 'x')).toEqual({
    css: '.a{}',
    data: { manifest: { a: 1 } },
  })
  expect(outputModuleSource({ css: '.a{}' }, 'css')).toBe('export default ".a{}"\n')
  expect(outputModuleSource({ data: { manifest: { a: 1 } } }, 'manifest')).toBe(
    'export default {"a":1}\n',
  )
})

test('Metro resolves the same specifiers to files written in its cache directory', async () => {
  const root = await project({
    'demo.toned.ts': "export default { css: '.x { color: blue }', manifest: { systemId: 'demo' } }\n",
  })
  const config = await withTonedOutputs(
    { projectRoot: root, resolver: {} },
    { outputs: ['*.toned.ts'], cacheDir: join(root, '.cache') },
  )
  const resolve = (name: string) =>
    config.resolver.resolveRequest({ resolveRequest: () => ({ type: 'empty' }) }, name, 'web')
  const css = resolve('toned:demo')
  const manifest = resolve('toned:demo/manifest')
  if (css.type !== 'sourceFile' || manifest.type !== 'sourceFile') throw new Error('unresolved')
  expect(await readFile(String(css.filePath), 'utf8')).toBe('.x { color: blue }')
  expect(await readFile(String(manifest.filePath), 'utf8')).toBe(
    'export default {"systemId":"demo"}\n',
  )
  expect(resolve('react')).toEqual({ type: 'empty' })
})

test('the synchronous Metro form builds in a child process and resolves the same files', async () => {
  const root = await project({ 'demo.toned.ts': "export default { css: '.y { color: red }' }\n" })
  const config = withTonedOutputsSync(
    { projectRoot: root, resolver: {} },
    { outputs: ['*.toned.ts'], cacheDir: join(root, '.cache') },
  )
  const resolve = (name: string) =>
    config.resolver.resolveRequest({ resolveRequest: () => ({ type: 'empty' }) }, name, 'web')
  const css = resolve('toned:demo')
  if (css.type !== 'sourceFile') throw new Error('unresolved')
  expect(await readFile(String(css.filePath), 'utf8')).toBe('.y { color: red }')
  expect(() => resolve('toned:nope')).toThrow(/toned:nope is not a Toned output; the outputs are: demo/)
})

test('an edit after a failed rebuild, or during one, still rebuilds the output', async () => {
  const root = await project({
    'usage.ts': "export const used = 'first'\n",
    'site.toned.ts':
      "import { used } from './usage.ts'\nexport default { css: `.used-${used} {}` }\n",
  })
  const usage = join(root, 'usage.ts')
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  expect((await loader.load('site')).css).toBe('.used-first {}')

  // A typo: the rebuild fails, and the output keeps the files it last read.
  await writeFile(usage, "throw new Error('typo')\n")
  expect(loader.invalidate(usage)).toEqual(['site'])
  await expect(loader.load('site')).rejects.toThrow('typo')

  // Fixing it rebuilds.
  await writeFile(usage, "export const used = 'fixed'\n")
  expect(loader.invalidate(usage)).toEqual(['site'])
  // A second save while that rebuild runs is not lost either.
  const rebuilding = loader.load('site')
  expect(loader.invalidate(usage)).toEqual(['site'])
  await rebuilding
  expect((await loader.load('site')).css).toBe('.used-fixed {}')
})

test('an output file must export a known shape: no unknown keys, no promise, css or data, JSON data', () => {
  const file = '/app/ui.toned.ts'
  const shape = (value: unknown) => () => toOutput({ default: value }, file)
  expect(shape({})).toThrow(
    'Toned output /app/ui.toned.ts has no css or data: export { css } or { data } (or a buildStyles artifact)',
  )
  expect(shape({ CSS: '.a{}' })).toThrow(
    'Toned output /app/ui.toned.ts: unknown key "CSS"; did you mean "css"? An output has css, manifest, data, inputs',
  )
  expect(shape({ css: '.a{}', mainfest: {} })).toThrow('did you mean "manifest"?')
  expect(shape({ css: '.a{}', extra: 1 })).toThrow(
    'Toned output /app/ui.toned.ts: unknown key "extra". An output has css, manifest, data, inputs',
  )
  expect(shape(Promise.resolve({ css: '' }))).toThrow(
    'Toned output /app/ui.toned.ts default-exports a promise: await it (`export default await build()`)',
  )
  expect(shape({ css: Promise.resolve('') })).toThrow('css is a promise: await it')
  expect(shape({ data: { usage: () => 1 } })).toThrow(
    'Toned output /app/ui.toned.ts: data.usage is a function; data must be JSON (strings, finite numbers, booleans, null, arrays and plain objects)',
  )
  expect(shape({ data: { usage: [new Map()] } })).toThrow('data.usage[0] is a Map')
  expect(shape({ data: { usage: Number.NaN } })).toThrow('data.usage is NaN')
  expect(shape({ css: '', manifest: { at: new Date(0) } })).toThrow('manifest.at is a Date')
  expect(shape({ data: [1] })).toThrow('data must be an object of named entries')
  expect(shape({ css: '.a{}', inputs: ['./usage.md'] })()).toEqual({
    css: '.a{}',
    data: {},
    inputs: ['/app/usage.md'],
  })
  // Only data keys a specifier can name: `toned:ui/<key>`.
  expect(shape({ data: { 'a/b': 1 } })).toThrow('data key "a/b" cannot be imported')
  expect(shape({ css: '', data: { css: 'x' } })).toThrow('data key "css" is reserved')
})

test('defineOutput types an output file and returns it unchanged', () => {
  const value = { css: '.a{}', data: { tokens: { gap: [1, 2] } } }
  expect(defineOutput(value)).toBe(value)
  // A buildStyles artifact is an output as it is.
  const artifact = buildStyles(defineSystem({ id: 'define-output', tokens: {} }), { sheets: [] })
  expect(toOutput(defineOutput(artifact), 'x').data?.['manifest']).toEqual(artifact.manifest)
  // @ts-expect-error a misspelled key is a type error
  defineOutput({ CSS: '.a{}' })
  // @ts-expect-error data must be JSON
  defineOutput({ data: { fn: () => 1 } })
  // @ts-expect-error a promise must be awaited first
  defineOutput(Promise.resolve({ css: '' }))
})

test('loads that overlap share one module runner, so a module two outputs import runs once', async () => {
  const root = await project({
    'shared.ts':
      "const g = globalThis as { tonedSharedRuns?: number }\ng.tonedSharedRuns = (g.tonedSharedRuns ?? 0) + 1\nexport const runs = g.tonedSharedRuns\n",
    'one.toned.ts': "import { runs } from './shared.ts'\nexport default { data: { runs } }\n",
    'two.toned.ts': "import { runs } from './shared.ts'\nexport default { data: { runs } }\n",
  })
  const g = globalThis as { tonedSharedRuns?: number }
  g.tonedSharedRuns = 0
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  const all = await loader.loadAll()
  expect(g.tonedSharedRuns).toBe(1)
  expect(all['one']?.data?.['runs']).toBe(1)
  // Once those loads settle the runner closes: the next load is a fresh graph.
  loader.invalidate(join(root, 'shared.ts'))
  await loader.load('one')
  expect(g.tonedSharedRuns).toBe(2)
})

test('outputs that import each other, even through a helper module, are an error rather than a hang', async () => {
  const root = await project({
    'helper.ts': "import b from 'toned:b/value'\nexport const fromB = b\n",
    'a.toned.ts': "import { fromB } from './helper.ts'\nexport default { data: { value: fromB } }\n",
    'b.toned.ts': "import a from 'toned:a/value'\nexport default { data: { value: a } }\n",
  })
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  await expect(loader.load('a')).rejects.toThrow(/Toned outputs import each other: (a -> b -> a|b -> a -> b)/)
}, 10_000)

test('files an output reads outside its imports are declared as inputs, watched and checked', async () => {
  const root = await project({
    'notes.md': 'first',
    'site.toned.ts':
      "import { readFileSync } from 'node:fs'\nconst notes = new URL('./notes.md', import.meta.url)\nexport default { css: `/* ${readFileSync(notes, 'utf8')} */`, inputs: [notes] }\n",
  })
  const notes = join(root, 'notes.md')
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  expect((await loader.load('site')).css).toBe('/* first */')
  expect(loader.watchedFiles()).toContain(notes)
  expect([...loader.sourceFiles('site').keys()]).toEqual([join(root, 'site.toned.ts'), notes])
  // A second build without a watcher (another `vite build`) checks content.
  expect(await loader.refresh()).toEqual([])
  await writeFile(notes, 'second')
  expect(await loader.refresh()).toEqual(['site'])
  expect((await loader.load('site')).css).toBe('/* second */')
})

test('an added or deleted output file is found again', async () => {
  const root = await project({ 'one.toned.ts': "export default { css: '.one {}' }\n" })
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  await loader.loadAll()
  expect(loader.rediscover()).toBe(false)
  await writeFile(join(root, 'two.toned.ts'), "export default { css: '.two {}' }\n")
  expect(loader.rediscover()).toBe(true)
  expect(loader.names.toSorted()).toEqual(['one', 'two'])
  expect((await loader.load('two')).css).toBe('.two {}')
})

test('an unknown data key names the output and the keys it has', () => {
  expect(() => outputModuleSource({ css: '', data: { manifest: {} } }, 'tokens', 'ui')).toThrow(
    'toned:ui has no "tokens"; it has: css, manifest',
  )
})

test('an output that fails on its first build still knows the files it reached', async () => {
  const root = await project({
    'usage.ts': "throw new Error('typo')\n",
    'site.toned.ts': "import { used } from './usage.ts'\nexport default { css: `.used-${used} {}` }\n",
  })
  const usage = join(root, 'usage.ts')
  const loader = createOutputsLoader({ outputs: ['*.toned.ts'], root })
  await expect(loader.load('site')).rejects.toThrow('typo')
  expect(loader.watchedFiles().toSorted()).toEqual([join(root, 'site.toned.ts'), usage])
  await writeFile(usage, "export const used = 'fixed'\n")
  expect(loader.invalidate(usage)).toEqual(['site'])
  expect((await loader.load('site')).css).toBe('.used-fixed {}')
})
