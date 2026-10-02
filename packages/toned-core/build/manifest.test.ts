import { expect, test } from 'vitest'

import { createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import {
  assertBuildArtifact,
  assertManifestConditions,
  buildStyles,
} from './index.ts'

test('bundled token enumeration order does not invalidate the build manifest', () => {
  const width = defineToken({
    values: [20, 40],
    resolve: (value) => ({ width: value }),
  })
  const opacity = defineToken({
    values: [0, 1],
    resolve: (value) => ({ opacity: value }),
  })
  const built = defineSystem({ id: 'bundled', tokens: { width, opacity } })
  const bundled = defineSystem({ id: 'bundled', tokens: { opacity, width } })
  const rules = { Root: { width: 20, opacity: 1 } } as const
  const artifact = buildStyles(built, { sheets: [built.stylesheet(rules)] })
  const expected = createWebRenderer(built, {
    manifest: artifact.manifest,
  }).resolve(built.stylesheet(rules))
  const actual = createWebRenderer(bundled, {
    manifest: artifact.manifest,
  }).resolve(bundled.stylesheet(rules))
  expect(actual.Root.className).toBe(expected.Root.className)
  expect(actual.Root.style).toEqual(expected.Root.style)
  expect(() => assertBuildArtifact(artifact)).not.toThrow()

  const changed = defineSystem({
    id: 'bundled',
    tokens: {
      opacity,
      width: defineToken({
        values: [20, 60],
        resolve: (value) => ({ width: value }),
      }),
    },
  })
  expect(() =>
    createWebRenderer(changed, { manifest: artifact.manifest }),
  ).toThrow('different system definition')
})

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
test('manifest rejects a changed external variable contract', () => {
  const original = defineSystem({
    id: 'external',
    tokens: {},
    externalCssVariables: ['--brand'],
  })
  const current = defineSystem({
    id: 'external',
    tokens: {},
    externalCssVariables: ['--accent'],
  })
  const { manifest } = buildStyles(original, { sheets: [] })
  expect(() => createWebRenderer(current, { manifest, tokens: {} })).toThrow(
    'different system definition',
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

test('the same tokens in another key order are the same system', () => {
  // A system spread from module namespaces gets its key order from the runtime:
  // sorted by name under the spec (Bun, Node), declaration order under Vite's
  // SSR module runner. Neither order may make the committed manifest stale.
  const lineHeight = {
    values: [0] as const,
    resolve: () => ({ lineHeight: 1 }),
  }
  const letterSpacing = {
    values: [''] as const,
    resolve: () => ({ letterSpacing: '0' }),
  }
  const built = defineSystem({
    id: 'key-order',
    tokens: { letterSpacing, lineHeight },
  })
  const { manifest } = buildStyles(built, { sheets: [] })
  const reordered = defineSystem({
    id: 'key-order',
    tokens: { lineHeight, letterSpacing },
  })
  expect(() =>
    createWebRenderer(reordered, { manifest, tokens: {} }),
  ).not.toThrow()
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

test('distinguishes anonymous legacy output from the explicit legacy namespace', () => {
  const token = defineToken({
    values: [1],
    resolve: (value) => ({ gap: value }),
  })
  const anonymous = defineSystem({ gap: token })
  const named = defineSystem({ id: 'legacy', tokens: { gap: token } })
  const manifest = buildStyles(anonymous, { sheets: [] }).manifest
  expect(manifest.namespace).toBe(null)
  expect(() => createWebRenderer(named, { manifest, tokens: {} })).toThrow(
    'namespace',
  )
})
