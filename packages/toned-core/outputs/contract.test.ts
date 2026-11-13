/**
 * The output contract, run against every consumer: Vite (a dev server), Bun (a
 * real `bun --preload @toned/core/bun/register` process), Metro, and scripts
 * (`loadOutput`). Each must serve the same values for the same specifiers, from
 * the same package declaration, and fail with the same messages.
 */
import { spawnSync } from 'node:child_process'
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
import { fileURLToPath } from 'node:url'

import { createServer } from 'vite'
import { afterAll, describe, expect, test } from 'vitest'

import { withTonedOutputs } from '../metro/index.ts'
import { tonedOutputs } from '../vite/index.ts'
import { outputModuleSource, parseOutputSpecifier } from './index.ts'
import { loadOutput } from './runner.ts'

type Result = { value: unknown } | { error: string }
type Adapter = (
  root: string,
  specifiers: readonly string[],
) => Promise<Result[]>

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error)
/** The value of `export default <json>`, as every adapter's module source has it. */
const evaluate = (source: string): unknown =>
  JSON.parse(source.replace(/^export default /, '').trim())

const vite: Adapter = async (root, specifiers) => {
  const server = await createServer({
    root,
    configFile: false,
    logLevel: 'silent',
    server: { middlewareMode: true, hmr: false, ws: false },
    plugins: [tonedOutputs()],
  })
  try {
    const results: Result[] = []
    for (const specifier of specifiers)
      results.push(
        await server.ssrLoadModule(specifier).then(
          (module) => ({ value: (module as { default: unknown }).default }),
          (error) => ({ error: messageOf(error) }),
        ),
      )
    return results
  } finally {
    await server.close()
  }
}

const register = fileURLToPath(new URL('../bun/register.ts', import.meta.url))
const hasBun = spawnSync('bun', ['--version']).status === 0
const bun: Adapter = async (root, specifiers) => {
  const script = join(root, 'contract-script.ts')
  await writeFile(
    script,
    `const results = []
for (const specifier of ${JSON.stringify(specifiers)})
  results.push(await import(specifier).then(m => ({ value: m.default }), e => ({ error: e.message })))
console.log(JSON.stringify(results))
`,
  )
  const run = spawnSync('bun', ['--preload', register, script], {
    cwd: root,
    encoding: 'utf8',
  })
  if (run.status !== 0) throw new Error(run.stderr)
  return JSON.parse(run.stdout.trim().split('\n').pop() ?? '[]') as Result[]
}

const metro: Adapter = async (root, specifiers) => {
  let config: Awaited<ReturnType<typeof withTonedOutputs>>
  try {
    config = await withTonedOutputs(
      { projectRoot: root, resolver: {} },
      { cacheDir: join(root, '.metro') },
    )
  } catch (error) {
    return specifiers.map(() => ({ error: messageOf(error) }))
  }
  const results: Result[] = []
  for (const specifier of specifiers) {
    try {
      const resolved = config.resolver.resolveRequest(
        { resolveRequest: () => ({ type: 'empty' }) },
        specifier,
        'ios',
      )
      results.push({
        value: evaluate(await readFile(String(resolved['filePath']), 'utf8')),
      })
    } catch (error) {
      results.push({ error: messageOf(error) })
    }
  }
  return results
}

const script: Adapter = async (root, specifiers) => {
  const results: Result[] = []
  for (const specifier of specifiers) {
    const { name, key = 'css' } = parseOutputSpecifier(specifier) ?? {
      name: '',
    }
    results.push(
      await loadOutput(name, { root })
        .then((output) => ({
          value: evaluate(outputModuleSource(output, key, name)),
        }))
        .catch((error) => ({ error: messageOf(error) })),
    )
  }
  return results
}

const adapters: [string, Adapter, boolean][] = [
  ['vite', vite, true],
  ['bun', bun, hasBun],
  ['metro', metro, true],
  ['script', script, true],
]

const roots: string[] = []
afterAll(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true })
})
async function project(files: Record<string, string>) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'toned-contract-')))
  roots.push(root)
  const all = {
    'package.json': JSON.stringify({
      name: 'app',
      toned: { outputs: ['toned/*.toned.ts'] },
    }),
    ...files,
  }
  for (const [path, content] of Object.entries(all)) {
    await mkdir(join(root, path, '..'), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}

/** Fixtures, and what every consumer must serve for them. */
const fixtures = {
  served: {
    files: {
      'toned/ui.toned.ts':
        "export default { css: '.ui {}', manifest: { systemId: 'ui' } }\n",
      'toned/extra.toned.ts':
        "import manifest from 'toned:ui/manifest'\nexport default { css: '.extra {}', data: { system: manifest.systemId, tokens: { gap: [1, 2] } } }\n",
    },
    expected: {
      'toned:ui/css': { value: '.ui {}' },
      'toned:ui/manifest': { value: { systemId: 'ui' } },
      'toned:extra/css': { value: '.extra {}' },
      'toned:extra/system': { value: 'ui' },
      'toned:extra/tokens': { value: { gap: [1, 2] } },
      'toned:nope/css': {
        error: 'toned:nope is not a Toned output; the outputs are: extra, ui',
      },
      'toned:ui/tokens': {
        error: 'toned:ui has no "tokens"; it has: css, manifest',
      },
    },
  },
  'bad shape': {
    files: { 'toned/bad.toned.ts': "export default { CSS: '.bad {}' }\n" },
    expected: {
      'toned:bad/css': { error: 'unknown key "CSS"; did you mean "css"?' },
    },
  },
  'a cycle': {
    files: {
      'toned/a.toned.ts':
        "import b from 'toned:b/value'\nexport default { data: { value: b } }\n",
      'toned/b.toned.ts':
        "import a from 'toned:a/value'\nexport default { data: { value: a } }\n",
    },
    expected: { 'toned:a/value': { error: 'Toned outputs import each other' } },
  },
} satisfies Record<
  string,
  { files: Record<string, string>; expected: Record<string, Result> }
>

describe.each(Object.entries(fixtures))('%s', (_, fixture) => {
  test.each(adapters)(
    '%s serves the contract',
    async (_name, adapter, available) => {
      if (!available) return
      const root = await project(fixture.files)
      const specifiers = Object.keys(fixture.expected)
      const results = await adapter(root, specifiers)
      specifiers.forEach((specifier, i) => {
        const expected = (fixture.expected as Record<string, Result>)[
          specifier
        ] as Result
        const actual = results[i] as Result
        if ('value' in expected) expect(actual, specifier).toEqual(expected)
        else {
          expect(actual, specifier).toHaveProperty('error')
          expect((actual as { error: string }).error, specifier).toContain(
            expected.error,
          )
        }
      })
    },
    20_000,
  )
})
