import { expect, test, vi } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import type { Variants } from '../types/index.ts'
import { derivationSteps } from './derivations.ts'
import * as variantProcessing from './variantProcessing.ts'

const ui = defineSystem({
  id: 'pure-overrides',
  tokens: {
    opacity: defineToken({
      values: [0, 0.5, 1] as const,
      resolve: (opacity) => ({ opacity }),
    }),
    width: defineToken({
      values: [4, 8] as const,
      resolve: (width) => ({ width }),
    }),
  },
})
const sheet = ui.stylesheet({ Root: { opacity: 0, width: 4 } }).variants(
  ($: Variants<{ active: boolean }>) => ({
    [$.active(true)]: { Root: { opacity: 0.5 } },
  }),
  { defaults: { active: true } },
)

test('pure override sheets add authoritative layers for native and CSS rendering', () => {
  const overridden = sheet.extend({ Root: { opacity: 1, width: null } })
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(native.resolve(overridden).Root.style).toEqual({ opacity: 1 })
  expect(native.resolve(sheet).Root.style).toEqual({ opacity: 0.5, width: 4 })
  const css = buildStyles(ui, { sheets: [overridden] })
  const web = createWebRenderer(ui, {
    manifest: css.manifest,
    tokens: {},
  }).resolve(overridden)
  expect(web.Root.className).not.toContain('width_4')
  expect(
    web.Root.style['opacity'] === 1 ||
      web.Root.className?.split(' ').includes('pure-overrides--opacity_1'),
  ).toBe(true)
})

test('pure override factories select existing variants and retain defaults', () => {
  const overridden = sheet.extend({}, ($) => ({
    [$.active(true)]: { Root: { opacity: 1 } },
  }))
  const native = createNativeRenderer(ui, { tokens: {} })
  expect(native.resolve(overridden).Root.style['opacity']).toBe(1)
  expect(
    native.resolve(overridden, { variants: { active: false } }).Root.style[
      'opacity'
    ],
  ).toBe(0)
})

test('override query factories retain nullable leaves, named composition and part predicates', () => {
  const conditions = defineSystem({
    id: 'override-query-runtime',
    tokens: ui.system,
    conditions: { media: { wide: 800 } },
  })
  const base = conditions
    .stylesheet({ Root: { opacity: 0.5, width: 4 } })
    .variants(($: Variants<{ active: boolean }>) => ({
      [$.active(true)]: { Root: { opacity: 0.5 } },
    }))
  const derived = base.extend(
    (q) => ({
      Root: { width: null },
      [q.all(q.media('wide'), q.part('Root').state('hover'))]: {
        Root: { opacity: 0 },
      },
    }),
    ($, q) => ({
      [$('shared')]: { Root: { opacity: 1 } },
      [$.active(true)]: {
        [q.not(q.part('Root').state('hover'))]: { $compose: 'shared' },
      },
    }),
  )
  const renderer = createNativeRenderer(conditions, { tokens: {} })
  expect(
    renderer.resolve(derived, {
      variants: { active: true },
      facts: { '@wide': true, 'Root:hover': true },
    }).Root.style,
  ).toEqual({ opacity: 0 })
  expect(
    renderer.resolve(derived, {
      variants: { active: true },
      facts: { '@wide': false, 'Root:hover': false },
    }).Root.style,
  ).toEqual({ opacity: 1 })
  expect(
    renderer.resolve(base, { variants: { active: true } }).Root.style,
  ).toEqual({ opacity: 0.5, width: 4 })
  expect(buildStyles(conditions, { sheets: [derived] }).css).toMatch(
    /min-width:\s*800px/,
  )
})

test('untyped override queries reject implicit local states at sheet level', () => {
  const q = ui.q
  expect(() =>
    sheet.extend({
      [q.all(q.state('hover'))]: { Root: { opacity: 0 } },
    } as never),
  ).toThrow('sheet-level')
})

test.each(['$kind', '$$type'])(
  'override metadata %s is rejected before merging or composition',
  (key) => {
    for (const value of [null, undefined, 'view', 'text']) {
      expect(() => sheet.extend({ Root: { [key]: value } } as never)).toThrow(
        'static part kind',
      )
      for (const condition of ['Root:hover', 'Root~:hover']) {
        expect(() =>
          sheet.extend({
            Root: { [condition]: { [key]: value } },
          } as never),
        ).toThrow('static part kind')
      }
      expect(() =>
        sheet.extend(
          {},
          ($) =>
            ({
              [$('unused')]: { Root: { [key]: value } },
            }) as never,
        ),
      ).toThrow('static part kind')
    }
  },
)

test('plain override variants do not merge composition source defaults', () => {
  const prior = sheet.extend({ Root: { width: null } })
  const merge = vi.spyOn(variantProcessing, 'deepMerge')
  let derived: typeof sheet
  try {
    derived = prior.extend({ Root: { opacity: 0 } }, ($) => ({
      [$.active(true)]: { Root: { opacity: 1 } },
    }))
    expect(merge).not.toHaveBeenCalled()
  } finally {
    merge.mockRestore()
  }
  expect(
    createNativeRenderer(ui, { tokens: {} }).resolve(derived!).Root.style,
  ).toEqual({ opacity: 1 })
})

test("an extension wins over the sheet's variants; its own variant rules win over both", () => {
  const native = createNativeRenderer(ui, { tokens: {} })
  const resolve = (target: typeof sheet, active: boolean) =>
    native.resolve(target, { variants: { active } }).Root.style
  // The sheet: opacity 0, and 0.5 when active.
  expect(resolve(sheet, true)).toMatchObject({ opacity: 0.5 })
  const flat = sheet.extend({ Root: { opacity: 1 } })
  expect(resolve(flat, false)).toMatchObject({ opacity: 1 })
  expect(resolve(flat, true)).toMatchObject({ opacity: 1 })
  const restated = sheet.extend({ Root: { opacity: 1 } }, ($) => ({
    [$.active(true)]: { Root: { opacity: 0 } },
  }))
  expect(resolve(restated, false)).toMatchObject({ opacity: 1 })
  expect(resolve(restated, true)).toMatchObject({ opacity: 0 })
  // The sheet it was derived from is untouched.
  expect(resolve(sheet, true)).toMatchObject({ opacity: 0.5 })
})

test('an extension restyles existing parts only', () => {
  expect(() => sheet.extend({ Rot: { opacity: 1 } } as never)).toThrow(
    /"Rot" is not one of them \(Root\)/,
  )
})

test('derivation steps lead from an ancestor to the derived sheet', () => {
  const first = sheet.extend({ Root: { opacity: 1 } })
  const second = first.extend({ Root: { width: 8 } })
  expect(derivationSteps(sheet, sheet)).toEqual([])
  expect(derivationSteps(second, sheet)?.map((step) => step.rules)).toEqual([
    { Root: { opacity: 1 } },
    { Root: { width: 8 } },
  ])
  expect(derivationSteps(second, first)).toHaveLength(1)
  expect(derivationSteps(sheet, second)).toBeUndefined()
})
