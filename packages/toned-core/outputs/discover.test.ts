import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, test } from 'vitest'

import { declaredOutputs, discoverOutputs } from './discover.ts'

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true })
})

async function tree(files: Record<string, string>, links: Record<string, string> = {}) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-discover-')))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  for (const [path, target] of Object.entries(links)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await symlink(join(root, target), join(root, path))
  }
  return root
}

const pkg = (value: object) => JSON.stringify(value)
const output = "export default { css: '' }\n"

/** An app using a workspace kit, which uses workspace tokens, plus published packages. */
const workspace = () =>
  tree(
    {
      'app/package.json': pkg({
        name: 'app',
        toned: { outputs: ['src/*.toned.ts'] },
        dependencies: { kit: 'workspace:*', published: '1.0.0' },
        devDependencies: { 'published-kit': '1.0.0' },
      }),
      'app/src/app.toned.ts': output,
      'kit/package.json': pkg({
        name: 'kit',
        toned: { outputs: ['styles/*.toned.ts'] },
        dependencies: { tokens: 'workspace:*' },
        devDependencies: { 'dev-only': '1.0.0' },
      }),
      'kit/styles/kit.toned.ts': output,
      'kit/styles/kit-palette.toned.ts': output,
      'tokens/package.json': pkg({ name: 'tokens', toned: { outputs: ['*.toned.ts'] } }),
      'tokens/tokens.toned.ts': output,
      // A published package with no `toned` field is not followed.
      'app/node_modules/published/package.json': pkg({
        name: 'published',
        dependencies: { hidden: '1.0.0' },
      }),
      'app/node_modules/hidden/package.json': pkg({
        name: 'hidden',
        toned: { outputs: ['*.toned.ts'] },
      }),
      'app/node_modules/hidden/hidden.toned.ts': output,
      // A published package that declares outputs is.
      'app/node_modules/published-kit/package.json': pkg({
        name: 'published-kit',
        toned: { outputs: ['dist/*.toned.ts'] },
      }),
      'app/node_modules/published-kit/dist/published-kit.toned.ts': output,
      // A dependency's devDependencies are not installed for the app.
      'kit/node_modules/dev-only/package.json': pkg({
        name: 'dev-only',
        toned: { outputs: ['*.toned.ts'] },
      }),
      'kit/node_modules/dev-only/dev-only.toned.ts': output,
    },
    { 'app/node_modules/kit': 'kit', 'kit/node_modules/tokens': 'tokens' },
  )

test('without globs, outputs come from the packages that declare them, through the dependency graph', async () => {
  const root = await workspace()
  const files = discoverOutputs(join(root, 'app'))
  expect(Object.keys(files).toSorted()).toEqual([
    'app',
    'kit',
    'kit-palette',
    'published-kit',
    'tokens',
  ])
  // Workspace links resolve to the package's real directory.
  expect(files['tokens']).toBe(join(root, 'tokens/tokens.toned.ts'))
  // A root below the package (a Vite root in src/) finds the package above it.
  expect(Object.keys(discoverOutputs(join(root, 'app/src'))).toSorted()).toEqual(
    Object.keys(files).toSorted(),
  )
  // Breadth first: the app, its dependencies, then theirs.
  expect(declaredOutputs(join(root, 'app')).map(d => d.dir)).toEqual([
    join(root, 'app'),
    join(root, 'kit'),
    join(root, 'app/node_modules/published-kit'),
    join(root, 'tokens'),
  ])
})

test('explicit globs replace the declarations', async () => {
  const root = await workspace()
  expect(Object.keys(discoverOutputs(join(root, 'app'), ['src/*.toned.ts']))).toEqual(['app'])
})

test('a malformed declaration names its package.json', async () => {
  const root = await tree({ 'package.json': pkg({ name: 'bad', toned: { outputs: 'x.toned.ts' } }) })
  expect(() => discoverOutputs(root)).toThrow(
    `${join(root, 'package.json')}: "toned.outputs" must be an array of globs relative to the package`,
  )
})

test('two packages providing one output name is an error naming both files', async () => {
  const root = await tree(
    {
      'package.json': pkg({ name: 'a', toned: { outputs: ['*.toned.ts'] }, dependencies: { b: '*' } }),
      'ui.toned.ts': output,
      'b/package.json': pkg({ name: 'b', toned: { outputs: ['*.toned.ts'] } }),
      'b/ui.toned.ts': output,
    },
    { 'node_modules/b': 'b' },
  )
  expect(() => discoverOutputs(root)).toThrow(
    `Toned output "ui" is provided by both ${join(root, 'ui.toned.ts')} and ${join(root, 'b/ui.toned.ts')}`,
  )
})
