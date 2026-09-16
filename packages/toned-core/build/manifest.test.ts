import { expect, test } from 'vitest'
import { createWebRenderer } from '../server/index.ts'
import { defineSystem } from '../system/definers.ts'
import {
  assertBuildArtifact,
  assertManifestConditions,
  buildStyles,
} from './index.ts'

test('manifest rejects a stale named threshold even with the same system ID', () => {
  const old = defineSystem({
    id: 'responsive',
    tokens: {},
    conditions: { media: { md: 400 } },
  })
  const current = defineSystem({
    id: 'responsive',
    tokens: {},
    conditions: { media: { md: 800 } },
  })
  const artifact = buildStyles(old, { sheets: [] })
  expect(() =>
    createWebRenderer(current, { manifest: artifact.manifest, tokens: {} }),
  ).toThrow('different system definition')
})
test('build/runtime namespaces cannot be independently overridden', () => {
  const system = defineSystem({ id: 'actual', tokens: {} })
  expect(() => buildStyles(system, { sheets: [], systemId: 'other' })).toThrow(
    'runtime system namespace',
  )
})
test('manifest collection sees deep conditions and internal layer/AST symbols', () => {
  const system = defineSystem({}, { containers: { card: {} } })
  const condition = { '@card/>=400': { Root: { style: { opacity: 0 } } } }
  const deep: Record<string | symbol, unknown> = {
    a: { b: { c: { d: { e: { f: condition } } } } },
  }
  deep[Symbol.for('@toned/layers')] = [
    { '@card/>=500': { Root: { style: { opacity: 0 } } } },
  ]
  deep[Symbol.for('@toned/when')] = [
    { predicate: { op: 'atom', key: '@card/>=600' }, rules: {} },
  ]
  const manifest = buildStyles(system, {
    sheets: [],
    conditions: ['card/>=400', 'card/>=500', 'card/>=600'],
  }).manifest
  expect(() => assertManifestConditions(manifest, deep)).not.toThrow()
  expect(() =>
    assertManifestConditions({ ...manifest, conditions: [] }, deep),
  ).toThrow('undeclared condition')
})

test('manifest rejects changes to static alpha vocabulary and pseudo presence', () => {
  const token = {
    values: ['ink'] as const,
    resolve: () => ({ color: 'red' }),
    alphaChannel: ['color'],
    alphaSteps: [50],
  }
  const old = defineSystem({ id: 'alpha-schema', tokens: { color: token } })
  const { manifest } = buildStyles(old, { sheets: [] })
  for (const change of [
    { alphaSteps: [25] },
    { alphaChannel: ['backgroundColor'] },
    { pseudoRules: () => ({ ':hover': { color: 'blue' } }) },
    { inherit: true },
    { $types: ['text'] as const },
  ]) {
    const current = defineSystem({
      id: 'alpha-schema',
      tokens: { color: { ...token, ...change } },
    })
    expect(() => createWebRenderer(current, { manifest, tokens: {} })).toThrow(
      'different system definition',
    )
  }
})

test('an asset check detects CSS changed independently from its manifest', () => {
  const ui = defineSystem({ id: 'asset', tokens: {} })
  const artifact = buildStyles(ui, { sheets: [] })
  expect(() => assertBuildArtifact(artifact)).not.toThrow()
  expect(() =>
    assertBuildArtifact({
      ...artifact,
      css: `${artifact.css}\n.wrong { color:red }`,
    }),
  ).toThrow('fingerprint')
})

test('an explicitly named legacy system still gets its namespace', () => {
  const ui = defineSystem({
    id: 'legacy',
    tokens: {
      opacity: { values: [0], resolve: (opacity: number) => ({ opacity }) },
    },
  })
  const sheet = ui.stylesheet({ Root: { opacity: 0 } })
  const artifact = buildStyles(ui, { sheets: [sheet] })
  const props = createWebRenderer(ui, {
    manifest: artifact.manifest,
    tokens: {},
  }).resolve(sheet)
  expect(artifact.css).toContain('.legacy--opacity_0')
  expect(props.Root.className).toContain('legacy--opacity_0')
})
