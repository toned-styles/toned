import { expect, test, vi } from 'vitest'
import * as manifestValidation from '../build/manifest.ts'
import { buildStyles } from '../build/index.ts'
import { dp } from '../core/values.ts'
import { createWebRenderer } from './index.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import { createNativeRenderer } from './index.ts'

test('pure native rendering evaluates platform predicates against native', () => {
  const system = defineSystem({
    opacity: defineToken({
      values: [0, 1],
      resolve: (value) => ({ opacity: value }),
    }),
  })
  const sheet = system.stylesheet({ Root: { opacity: 1 } }).extend({
    [system.q.all(system.q.platform('native'))]: { Root: { opacity: 0 } },
  })
  expect(
    createNativeRenderer(system, { tokens: {} }).resolve(sheet).Root.style[
      'opacity'
    ],
  ).toBe(0)
})
test('renderer theme snapshots and returned nested styles cannot mutate other resolutions', () => {
  const system = defineSystem({
    shadow: defineToken({
      values: ['base'],
      resolve: (_value, tokens) => ({ shadowOffset: tokens['offset'] }),
    }),
  })
  const sheet = system.stylesheet({ Root: { shadow: 'base' } })
  const tokens = { offset: { width: 2, height: 3 } }
  const renderer = createNativeRenderer(system, { tokens })
  tokens.offset.width = 100
  const output = renderer.resolve(sheet)
  expect(output.Root.style['shadowOffset']).toEqual({ width: 2, height: 3 })
  expect(Object.isFrozen(output.Root.style['shadowOffset'])).toBe(true)
})

test('explicit token composition snapshots inputs, preserves composition symbols and never consults global config', async () => {
  const { createTokenStyles, cssVariableTokens } = await import('./index.ts')
  const { SYMBOL_ACCESS, SYMBOL_REF, SYMBOL_STYLE } = await import(
    '../utils/symbols.ts'
  )
  const { immutableSnapshot } = await import('../utils/immutable.ts')
  const system = defineSystem({
    ink: defineToken({
      values: [true],
      resolve: (_, tokens) => ({ color: tokens['ink'] }),
    }),
  })
  const tokens = { ink: 'red' }
  const t = createTokenStyles(system, {
    tokens,
    platform: 'web',
    useClassName: false,
  })
  tokens.ink = 'blue'
  const initial = t({ ink: true, $style: { padding: 2 } })
  const combined = t(initial, { $style: { margin: 3 } })
  expect(combined.style).toMatchObject({ color: 'red', padding: 2, margin: 3 })
  expect(Reflect.get(combined, SYMBOL_REF)).toBe(system)
  expect(Reflect.get(combined, SYMBOL_STYLE)).toMatchObject({
    ink: true,
    style: { padding: 2, margin: 3 },
  })
  expect(Reflect.get(combined, SYMBOL_ACCESS).ref).toBe(system)
  const variables = cssVariableTokens()
  expect(Object.isFrozen(variables)).toBe(true)
  expect(Object.getPrototypeOf(variables)).toBe(null)
  expect(immutableSnapshot(variables)).toBe(variables)
  expect(variables['ink']).toBe('var(--ink)')
  expect(
    createTokenStyles(system, {
      tokens: variables,
      platform: 'web',
      useClassName: false,
    })({ ink: true }).style,
  ).toMatchObject({ color: 'var(--ink)' })
})

test('renderer token composition follows the selected output backend', async () => {
  const { createRenderer } = await import('./index.ts')
  const system = defineSystem({
    opacity: defineToken({
      values: [1],
      resolve: (value) => ({ opacity: value }),
    }),
  })
  const renderer = createRenderer(system, {
    tokens: {},
    backend: {
      id: 'test',
      platform: 'web',
      browserConditions: false,
      resolve: (value) => ({ style: { ...value.style, outlineWidth: 7 } }),
    },
  })
  expect(renderer.t({ opacity: 1 }).style).toMatchObject({
    opacity: 1,
    outlineWidth: 7,
  })
})

test('web renderer defaults preserve CSS variable tokens through snapshots and lazy token composition', async () => {
  const { buildStyles } = await import('../build/index.ts')
  const { createWebRenderer } = await import('./index.ts')
  const system = defineSystem({
    ink: defineToken({
      values: ['example'] as const,
      dynamic: 'string',
      resolve: (name, tokens) => ({ color: tokens[name] }),
    }),
  })
  const sheet = system.stylesheet({ Root: { ink: 'brand' } })
  const manifest = buildStyles(system, { sheets: [sheet] }).manifest
  const renderer = createWebRenderer(system, { manifest })
  expect(renderer.tokens['brand']).toBe('var(--brand)')
  expect(renderer.t({ ink: 'brand' }).style).toMatchObject({
    color: 'var(--brand)',
  })
  expect(renderer.resolve(sheet).Root.style['color']).toBe('var(--brand)')
})

test('successful manifest validation is weakly cached per renderer and sheet; failures are retried', () => {
  const system = defineSystem({ id: 'validation-cache', tokens: {} })
  const sheet = system.stylesheet({ Root: { $style: { opacity: 1 } } })
  const manifest = buildStyles(system, { sheets: [sheet] }).manifest
  const renderer = createWebRenderer(system, { manifest })
  const assertConditions = vi.spyOn(
    manifestValidation,
    'assertManifestConditions',
  )
  try {
    for (let i = 0; i < 100; i++) renderer.validate(sheet)
    renderer.resolve(sheet)
    renderer.explain(sheet)
    expect(assertConditions).toHaveBeenCalledTimes(1)
    const derived = sheet.extend({ Root: { $style: { opacity: 0 } } })
    renderer.validate(derived)
    expect(assertConditions).toHaveBeenCalledTimes(2)
    createWebRenderer(system, { manifest }).validate(sheet)
    expect(assertConditions).toHaveBeenCalledTimes(3)
    const missing = sheet.extend({
      [system.q.media(dp(777))]: { Root: { $style: { opacity: 0 } } },
    })
    for (let i = 0; i < 2; i++)
      expect(() => renderer.validate(missing)).toThrow('undeclared condition')
    expect(assertConditions).toHaveBeenCalledTimes(5)
    const other = defineSystem({
      id: 'validation-cache',
      tokens: {},
    }).stylesheet({ Root: {} })
    for (let i = 0; i < 2; i++)
      expect(() => renderer.validate(other)).toThrow('different system')
  } finally {
    assertConditions.mockRestore()
  }
})

test('renderer owns an immutable manifest snapshot before any sheet validation', () => {
  const system = defineSystem({ id: 'manifest-snapshot', tokens: {} })
  const sheet = system.stylesheet((q) => ({
    Root: {},
    [q.media(dp(777))]: { Root: { $style: { opacity: 0 } } },
  }))
  const built = buildStyles(system, { sheets: [sheet] }).manifest
  const manifest = {
    ...built,
    conditions: [...built.conditions],
    extensions: [...(built.extensions ?? [])],
  }
  const renderer = createWebRenderer(system, { manifest })
  manifest.conditions.length = 0
  manifest.extensions.push('not-in-the-build')
  manifest.definition = 'changed'
  expect(() => renderer.validate(sheet)).not.toThrow()
  expect(renderer.manifest).not.toBe(manifest)
  expect(renderer.manifest?.conditions).toEqual(built.conditions)
  expect(renderer.manifest?.extensions).toEqual(built.extensions ?? [])
  expect(Object.isFrozen(renderer.manifest?.conditions)).toBe(true)
  const missing = sheet.extend({
    [system.q.media(dp(999))]: { Root: { $style: { opacity: 1 } } },
  })
  expect(() => renderer.validate(missing)).toThrow('undeclared condition')
})
