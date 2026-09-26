import type { Variants } from '../types/index.ts'
import { expect, test, vi } from 'vitest'
import * as variantProcessing from './variantProcessing.ts'
import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import { overrideSheet } from './overrideSheet.ts'

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
  const overridden = overrideSheet(sheet, { Root: { opacity: 1, width: null } })
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
  const overridden = overrideSheet(sheet, {}, ($) => ({
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
  const derived = overrideSheet(
    base,
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
    overrideSheet(sheet, {
      [q.all(q.state('hover'))]: { Root: { opacity: 0 } },
    } as never),
  ).toThrow('sheet-level')
})

test.each(['$kind', '$$type'])(
  'override metadata %s is rejected before merging or composition',
  (key) => {
    for (const value of [null, undefined, 'view', 'text']) {
      expect(() =>
        overrideSheet(sheet, { Root: { [key]: value } } as never),
      ).toThrow('static part kind')
      for (const condition of ['Root:hover', 'Root~:hover']) {
        expect(() =>
          overrideSheet(sheet, {
            Root: { [condition]: { [key]: value } },
          } as never),
        ).toThrow('static part kind')
      }
      expect(() =>
        overrideSheet(
          sheet,
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
  const prior = overrideSheet(sheet, { Root: { width: null } })
  const merge = vi.spyOn(variantProcessing, 'deepMerge')
  let derived: typeof sheet
  try {
    derived = overrideSheet(prior, { Root: { opacity: 0 } }, ($) => ({
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
