import { describe, expect, it, vi } from 'vitest'
import { cssVariablesBackend } from '../backends/index.ts'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createRenderer } from '../server/index.ts'
import { RULE_LAYERS } from '../stylesheet/rule-protocol.ts'
import { StyleMatcher } from '../stylesheet/StyleMatcher.ts'
import { defineSystem, defineToken } from '../system/definers.ts'
import {
  compilePlan,
  compileRules,
  explain,
  foldOperations,
  resolvePlan,
} from './plan.ts'
import { conditionPredicate } from './predicates.ts'

const gapResolver = vi.fn((value: number) => ({ gap: value }))
const system = () =>
  defineSystem({
    id: 'portable-plan',
    tokens: {
      gap: defineToken({
        values: [0, 4, 8, 12],
        properties: ['gap'],
        resolve: gapResolver,
      }),
      paint: defineToken({
        values: ['red', 'blue'],
        properties: ['color'],
        resolve: (value) => ({ color: value }),
      }),
    },
    conditions: { media: { wide: 800 }, states: { hovered: ':hover' } },
  })

describe('portable declaration plan', () => {
  it('evaluates tokens without invoking the CSS executor and preserves source-order winners', () => {
    const ui = system()
    const sheet = ui
      .stylesheet({ Root: { gap: 0, paint: 'red' } })
      .variants<{ size: 'small' | 'large'; accent: boolean }>()(($) => ({
      [$.size('small').accent(true)]: { Root: { gap: 12 } },
      [$.size('small')]: { Root: { gap: 4 } },
    }))
    const spy = vi.spyOn(ui, 'exec').mockImplementation(() => {
      throw new Error('CSS executor called')
    })
    const renderer = createNativeRenderer(ui, { tokens: {} })
    expect(
      renderer.resolve(sheet, { variants: { size: 'small', accent: true } })
        .Root.style,
    ).toEqual({ gap: 4, color: 'red' })
    const report = renderer.explain(sheet, {
      variants: { size: 'small', accent: true },
    })
    expect(report.parts['Root']!['gap']!.writes).toHaveLength(3)
    expect(report.parts['Root']!['gap']!.winner.token).toBe('gap')
    expect(report.diagnostics).toHaveLength(1)
    expect(report.diagnostics[0]?.field).toBe('gap')
    expect(spy).not.toHaveBeenCalled()
  })

  it('normalizes nested browser facts once, retaining symbolic structure only for the owning part', () => {
    const ui = system()
    const sheet = ui.stylesheet((q) => ({
      Root: { gap: 0, [q.media('wide')]: { [q.state('hovered')]: { gap: 8 } } },
    }))
    const plan = compilePlan(ui, sheet, 'web')
    expect(compilePlan(ui, sheet, 'web')).toBe(plan)
    expect(Object.isFrozen(plan.operations)).toBe(true)
    expect(
      plan.operations.some(
        (op) => op.token.startsWith('@') || op.token.startsWith(':'),
      ),
    ).toBe(false)
    const symbolic = resolvePlan(plan, ui, {}, {}, { preserveConditions: true })
    expect(JSON.stringify(symbolic)).toContain('"kind":"media"')
    expect(JSON.stringify(symbolic)).toContain('"kind":"state"')
    expect(
      foldOperations(
        resolvePlan(plan, ui, {}, { '@wide': true, 'Root:hovered': true })[
          'Root'
        ]!,
      ).style,
    ).toEqual({ gap: 8 })
    expect(
      foldOperations(resolvePlan(plan, ui, {}, { '@wide': true })['Root']!)
        .style,
    ).toEqual({ gap: 0 })
  })

  it('removes only the inherited declaration named by an override tombstone, across both compilers', () => {
    const ui = system()
    const rules = {
      Root: { gap: 4, style: { color: 'red', opacity: 0.5 } },
      '[size=small]': { Root: { gap: 8 } },
      [RULE_LAYERS]: [
        { Root: { gap: null, style: { color: null, opacity: undefined } } },
      ],
    }
    const plan = compileRules(ui, rules, 'native')
    expect(
      foldOperations(resolvePlan(plan, ui, {}, { size: 'large' })['Root']!)
        .style,
    ).toEqual({ opacity: 0.5 })
    expect(
      foldOperations(resolvePlan(plan, ui, {}, { size: 'small' })['Root']!)
        .style,
    ).toEqual({ opacity: 0.5, gap: 8 })
    const matcher = new StyleMatcher(rules, { sourceOrder: true })
    expect(matcher.match({ size: 'large' })['Root']).toEqual({
      style: { opacity: 0.5 },
    })
    expect(
      explain(plan, ui, {}, { size: 'small' }).parts['Root']!['gap']!.winner
        .layer,
    ).toBe(0)
  })

  it('includes each source occurrence in identity, keeps caches isolated across systems, and performs no resolver probes for diagnostics', () => {
    const ui = system()
    const resolver = gapResolver.mockClear()
    const rules = {
      Root: { gap: 4 },
      '[size=small][accent=true]': { Root: { gap: 12 } },
      '[size=small]': { Root: { gap: 8 } },
    }
    const a = compileRules(ui, rules, 'native')
    expect(resolver).not.toHaveBeenCalled()
    expect(a.diagnostics).toHaveLength(1)
    expect(new Set(a.operations.map((op) => op.origin.id)).size).toBe(
      a.operations.length,
    )
    expect(compileRules(system(), rules, 'native')).not.toBe(a)
  })
})

it('checks composite token footprints using actual inputs without placeholder probes', () => {
  const resolver = vi.fn((value: number) =>
    value ? { gap: value, opacity: 1 } : { gap: 0 },
  )
  const token = defineToken({
    values: [0, 1],
    properties: ['gap'],
    resolve: resolver,
  })
  expect(resolver).not.toHaveBeenCalled()
  expect(token.resolve(0, {})).toEqual({ gap: 0 })
  expect(() => token.resolve(1, {})).toThrow('undeclared field opacity')
})

it('rejects native alpha expressions the host cannot interpret and supports both endpoints', () => {
  const ui = defineSystem({
    paint: defineToken({
      values: ['red'],
      alphaChannel: ['color'],
      resolve: () => ({ color: 'red' }),
    }),
  })
  const renderer = createNativeRenderer(ui, { tokens: {} })
  expect(() =>
    renderer.resolve(ui.stylesheet({ Root: { paint: 'red/50' } })),
  ).toThrow('requires a resolved hex or rgb color')
  expect(
    renderer.resolve(ui.stylesheet({ Root: { paint: 'red/0' } })).Root.style,
  ).toEqual({ color: 'rgba(0, 0, 0, 0)' })
  expect(
    renderer.resolve(ui.stylesheet({ Root: { paint: 'red/100' } })).Root.style,
  ).toEqual({ color: 'red' })
})

it('proves subset shadows when a later finite OR selector includes every earlier value', () => {
  const ui = system()
  const plan = compileRules(
    ui,
    {
      Root: { gap: 0 },
      '[size=small][accent=true]': { Root: { gap: 8 } },
      '[size=small][size=large]': { Root: { gap: 4 } },
    },
    'native',
  )
  expect(plan.diagnostics).toHaveLength(1)
  expect(plan.diagnostics[0]!.field).toBe('gap')
  const partial = compileRules(
    ui,
    {
      Root: { gap: 0 },
      '[size=small][size=large][accent=true]': { Root: { gap: 8 } },
      '[size=small]': { Root: { gap: 4 } },
    },
    'native',
  )
  expect(partial.diagnostics).toHaveLength(0)
})

it('specializes platform AST branches before collecting complete build operations', () => {
  const ui = system()
  const sheet = ui
    .stylesheet({ Root: { gap: 0 } })
    .when(ui.q.all(ui.q.platform('native')), { Root: { gap: 8 } })
  const web = compilePlan(ui, sheet, 'web')
  const native = compilePlan(ui, sheet, 'native')
  expect(
    resolvePlan(web, ui, {}, {}, { evaluate: false })['Root']!.map(
      (operation) => operation.value,
    ),
  ).toEqual([0])
  expect(
    resolvePlan(native, ui, {}, {}, { evaluate: false })['Root']!.map(
      (operation) => operation.value,
    ),
  ).toEqual([0, 8])
})

it('snapshots authored values while deeply freezing compiler-owned shared metadata', () => {
  const ui = system()
  const raw = {
    Root: {
      style: { shadowOffset: { width: 2, height: 3 } },
      ':hover': { gap: 4 },
    },
  }
  const plan = compileRules(ui, raw, 'native')
  raw.Root.style.shadowOffset.width = 99
  const operation = plan.operations.find(
    (operation) => operation.token === 'style',
  )!
  expect((operation.value as any).shadowOffset.width).toBe(2)
  expect(Object.isFrozen((operation.value as any).shadowOffset)).toBe(true)
  expect(Object.isFrozen(operation)).toBe(true)
  expect(Object.isFrozen(operation.origin)).toBe(true)
  expect(Object.isFrozen(operation.origin.path)).toBe(true)
  expect(Object.isFrozen(plan.operations)).toBe(true)
  expect(Object.isFrozen(plan.diagnostics)).toBe(true)
  const state = plan.operations.find(
    (operation) => operation.token === 'gap',
  )!.predicate
  expect(Object.isFrozen(state)).toBe(true)
  if (state.op === 'atom') expect(Object.isFrozen(state.fact)).toBe(true)
})

it('undefined resolver fields inherit previous values across backends and explanations', () => {
  const ui = defineSystem({
    id: 'undefined-fields',
    tokens: {
      gap: defineToken({ values: [4], resolve: (value) => ({ gap: value }) }),
      maybe: defineToken({
        values: ['a'],
        resolve: () => ({ gap: undefined, opacity: 1 }),
      }),
    },
  })
  const sheet = ui.stylesheet({ Root: { gap: 4, maybe: 'a' } })
  const native = createNativeRenderer(ui, { tokens: {} })
  const web = createRenderer(ui, {
    backend: cssVariablesBackend,
    manifest: buildStyles(ui, { sheets: [sheet] }).manifest,
    tokens: {},
  })
  expect(native.resolve(sheet).Root.style).toEqual({ gap: 4, opacity: 1 })
  expect(web.resolve(sheet).Root.className).toBeTruthy()
  expect(buildStyles(ui, { sheets: [sheet] }).css).toContain('gap:4px')
  expect(web.explain(sheet).parts['Root']!['gap']!.value).toBe(4)
  expect(native.explain(sheet).parts['Root']!['gap']!.winner.token).toBe('gap')
})

it('rejects unknown platforms in authored and compiled predicates', () => {
  expect(() => conditionPredicate('@platform.ios')).toThrow(
    'unknown platform ios',
  )
  const ui = system()
  for (const platform of ['web', 'native'] as const)
    expect(() =>
      compileRules(ui, { Root: { '@platform.ios': { gap: 4 } } }, platform),
    ).toThrow('unknown platform ios')
})
