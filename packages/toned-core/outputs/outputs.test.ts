import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { build } from 'vite'
import { afterEach, expect, test } from 'vitest'

import { withTonedOutputs, withTonedOutputsSync } from '../metro/index.ts'
import { tonedOutputs } from '../vite/index.ts'
import { outputModuleSource, parseOutputSpecifier } from './index.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
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
  if (Array.isArray(result) || !('output' in result))
    throw new Error('Expected one build')
  const asset = (ext: string) =>
    result.output
      .filter((file) => file.fileName.endsWith(ext))
      .map((file) => ('source' in file ? String(file.source) : file.code))
      .join('\n')
  return { css: asset('.css'), js: asset('.js') }
}

const html = '<script type="module" src="/entry.js"></script>'

test('a nested stylesheet imports an output into its own layer, and code imports its data', async () => {
  const root = await project({
    'index.html': html,
    'entry.js':
      "import './app.css'\nimport manifest from 'toned:demo/manifest'\nconsole.log('id=' + manifest.systemId)",
    'app.css':
      "@layer base, components;\n@import './pkg/kit.css';\n.app { color: red }\n",
    'pkg/kit.css': "@import 'toned:demo' layer(components);\n",
    'outputs.ts':
      "export default { demo: { css: '.from-toned { color: blue }', data: { manifest: { systemId: 'demo-system' } } } }\n",
  })
  const { css, js } = await compile(
    root,
    tonedOutputs({ modules: ['outputs.ts'] }),
  )
  expect(css).toMatch(
    /@layer base, components;\s*@layer components\s*\{\s*\.from-toned/,
  )
  expect(css.indexOf('.from-toned')).toBeLessThan(css.indexOf('.app'))
  expect(js).toContain('demo-system')
})

test('a later outputs module reads an earlier one, and every build loads the sources fresh', async () => {
  const root = await project({
    'index.html': html,
    'entry.js': "import './app.css'",
    'app.css': "@import 'toned:site';\n",
    'usage.ts': "export const used = 'first'\n",
    'collect.ts':
      "import { used } from './usage.ts'\nexport default { inventory: { data: { usage: [used] } } }\n",
    'build.ts':
      "import usage from 'toned:inventory/usage'\nexport default { site: { css: `.used-${usage[0]} { color: blue }` } }\n",
  })
  const plugin = () => tonedOutputs({ modules: ['collect.ts', 'build.ts'] })
  expect((await compile(root, plugin())).css).toContain('.used-first')
  await writeFile(join(root, 'usage.ts'), "export const used = 'second'\n")
  const updated = (await compile(root, plugin())).css
  expect(updated).toContain('.used-second')
  expect(updated).not.toContain('.used-first')
})

test('an unknown output is a build error naming its missing file', async () => {
  const root = await project({
    'index.html': html,
    'entry.js': "import './app.css'",
    'app.css': "@import 'toned:missing';\n",
    'outputs.ts': "export default { demo: { css: '' } }\n",
  })
  await expect(
    compile(root, tonedOutputs({ modules: ['outputs.ts'] })),
  ).rejects.toThrow(/missing\.css/)
})

test('specifiers name an output and, optionally, one of its data entries or its css as a string', () => {
  expect(parseOutputSpecifier('toned:daylight')).toEqual({ name: 'daylight' })
  expect(parseOutputSpecifier('toned:daylight/manifest')).toEqual({
    name: 'daylight',
    key: 'manifest',
  })
  expect(parseOutputSpecifier('./toned.css')).toBeUndefined()
  expect(outputModuleSource({ css: '.a{}' }, 'css')).toBe(
    'export default ".a{}"\n',
  )
  expect(outputModuleSource({ data: { manifest: { a: 1 } } }, 'manifest')).toBe(
    'export default {"a":1}\n',
  )
})

test('Metro resolves the same specifiers to files written in its cache directory', async () => {
  const root = await project({
    'outputs.ts':
      "export default { demo: { css: '.x { color: blue }', data: { manifest: { systemId: 'demo' } } } }\n",
  })
  const config = await withTonedOutputs(
    { projectRoot: root, resolver: {} },
    { modules: ['outputs.ts'], cacheDir: join(root, '.cache') },
  )
  const resolve = (name: string) =>
    config.resolver.resolveRequest?.(
      { resolveRequest: () => ({ type: 'empty' }) },
      name,
      'web',
    )
  const css = resolve('toned:demo')
  const manifest = resolve('toned:demo/manifest')
  if (css?.type !== 'sourceFile' || manifest?.type !== 'sourceFile')
    throw new Error('unresolved')
  expect(await readFile(String(css.filePath), 'utf8')).toBe(
    '.x { color: blue }',
  )
  expect(await readFile(String(manifest.filePath), 'utf8')).toBe(
    'export default {"systemId":"demo"}\n',
  )
  expect(resolve('react')).toEqual({ type: 'empty' })
})

test('the synchronous Metro form collects in a child process and resolves the same files', async () => {
  const root = await project({
    'outputs.ts': "export default { demo: { css: '.y { color: red }' } }\n",
  })
  const config = withTonedOutputsSync(
    { projectRoot: root, resolver: {} },
    { modules: ['outputs.ts'], cacheDir: join(root, '.cache') },
  )
  const css = config.resolver.resolveRequest(
    { resolveRequest: () => ({ type: 'empty' }) },
    'toned:demo',
    'web',
  )
  if (css.type !== 'sourceFile') throw new Error('unresolved')
  expect(await readFile(String(css.filePath), 'utf8')).toBe('.y { color: red }')
  expect(() =>
    config.resolver.resolveRequest(
      { resolveRequest: () => ({ type: 'empty' }) },
      'toned:nope',
      'web',
    ),
  ).toThrow(/toned:nope is not a Toned output; the outputs are: demo/)
})
