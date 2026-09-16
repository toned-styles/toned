import { expect, test } from 'vitest'
import { buildStyles, assertManifestConditions } from './index.ts'
import { defineSystem } from '../system/definers.ts'
import { createWebRenderer } from '../server/index.ts'

test('manifest rejects a stale named threshold even with the same system ID', () => {
  const old = defineSystem({ id: 'responsive', tokens: {}, conditions: { media: { md: 400 } } })
  const current = defineSystem({ id: 'responsive', tokens: {}, conditions: { media: { md: 800 } } })
  const artifact = buildStyles(old, { sheets: [] })
  expect(() => createWebRenderer(current, { manifest: artifact.manifest, tokens: {} })).toThrow(
    'different system definition',
  )
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
  const deep: Record<string | symbol, unknown> = { a: { b: { c: { d: { e: { f: condition } } } } } }
  deep[Symbol.for('@toned/layers')] = [{ '@card/>=500': { Root: { style: { opacity: 0 } } } }]
  deep[Symbol.for('@toned/when')] = [{ predicate: { op: 'atom', key: '@card/>=600' }, rules: {} }]
  const manifest = buildStyles(system, {
    sheets: [],
    conditions: ['card/>=400', 'card/>=500', 'card/>=600'],
  }).manifest
  expect(() => assertManifestConditions(manifest, deep)).not.toThrow()
  expect(() => assertManifestConditions({ ...manifest, conditions: [] }, deep)).toThrow(
    'undeclared condition',
  )
})
