import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { build, createServer } from 'vite'
import { afterEach, expect, test } from 'vitest'

import { withTonedOutputs, withTonedOutputsSync } from '../metro/index.ts'
import { tonedOutputs } from '../vite/index.ts'
import { outputModuleSource, outputName, parseOutputSpecifier, toOutput } from './index.ts'
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

test('an unknown output is a build error naming its missing file', async () => {
  const root = await project({
    'index.html': html,
    'entry.js': "import './app.css'",
    'app.css': "@import 'toned:missing';\n",
    'demo.toned.ts': "export default { css: '' }\n",
  })
  await expect(compile(root, tonedOutputs({ outputs: ['*.toned.ts'] }))).rejects.toThrow(
    /missing\.css/,
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
