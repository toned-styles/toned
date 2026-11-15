import { describe, expect, test } from 'vitest'

import { createNativeRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from '../system/index.ts'
import type { Variants } from '../types/index.ts'
import {
  stylesheetVariantCombinations,
  stylesheetVariants,
} from './variants.ts'

const ui = defineSystem({
  id: 'variant-vocabulary',
  tokens: {
    opacity: defineToken({
      values: [0, 0.5, 1] as const,
      resolve: (opacity) => ({ opacity }),
    }),
  },
})

type Mods = {
  tone: 'quiet' | 'loud'
  size: 's' | 'm' | 'l'
  active: boolean
}

const base = ui.stylesheet({ Root: { opacity: 0 }, Label: { opacity: 0 } })

describe('stylesheetVariants', () => {
  test('a plain sheet has no axes', () => {
    expect(stylesheetVariants(base)).toEqual({})
  })

  test('plain axes list their values in the order selectors first name them', () => {
    const sheet = base.variants(($: Variants<Mods>) => ({
      [$.tone('quiet')]: { Root: { opacity: 0.5 } },
      [$.tone('loud')]: { Root: { opacity: 1 } },
      [$.size('s', 'm')]: { Label: { opacity: 0.5 } },
      [$.tone('loud').size('l')]: { Label: { opacity: 1 } },
    }))
    // One selector's values are canonical (sorted): `$.size('s', 'm')` is `[size=m][size=s]`.
    expect(stylesheetVariants(sheet)).toEqual({
      tone: ['quiet', 'loud'],
      size: ['m', 's', 'l'],
    })
  })

  test('a boolean axis is [false, true], whichever value its rules select', () => {
    const one = base.variants(($: Variants<Mods>) => ({
      [$.active(true)]: { Root: { opacity: 1 } },
    }))
    const both = base.variants(($: Variants<Mods>) => ({
      [$.active(false)]: { Root: { opacity: 0.5 } },
      [$.active(true)]: { Root: { opacity: 1 } },
    }))
    expect(stylesheetVariants(one)).toEqual({ active: [false, true] })
    expect(stylesheetVariants(both)).toEqual({ active: [false, true] })
  })

  test('an axis or value that only an .extend() layer selects is included', () => {
    const sheet = base.variants(($: Variants<Mods>) => ({
      [$.tone('quiet')]: { Root: { opacity: 0.5 } },
    }))
    const extended = sheet.extend({ Root: { opacity: 0.5 } }, ($) => ({
      [$.tone('loud')]: { Root: { opacity: 1 } },
      [$.size('l')]: { Label: { opacity: 1 } },
    }))
    expect(stylesheetVariants(extended)).toEqual({
      tone: ['quiet', 'loud'],
      size: ['l'],
    })
    // The original is unchanged by its derivation.
    expect(stylesheetVariants(sheet)).toEqual({ tone: ['quiet'] })
  })

  test('chained .variants() calls, before and after .extend(), all count', () => {
    const chained = base
      .variants(($: Variants<{ tone: Mods['tone'] }>) => ({
        [$.tone('quiet')]: { Root: { opacity: 0.5 } },
      }))
      .variants(($: Variants<{ size: Mods['size'] }>) => ({
        [$.size('m')]: { Label: { opacity: 0.5 } },
      }))
    expect(stylesheetVariants(chained)).toEqual({
      tone: ['quiet'],
      size: ['m'],
    })
    const after = chained
      .extend({ Root: { opacity: 1 } })
      .variants(($: Variants<{ active: boolean }>) => ({
        [$.active(true)]: { Root: { opacity: 0 } },
      }))
    expect(stylesheetVariants(after)).toEqual({
      tone: ['quiet'],
      size: ['m'],
      active: [false, true],
    })
  })

  test('a defaulted axis includes its default even when no rule selects it', () => {
    const sheet = base.variants(
      ($: Variants<Mods>) => ({ [$.tone('loud')]: { Root: { opacity: 1 } } }),
      { defaults: { tone: 'quiet', active: false } },
    )
    expect(stylesheetVariants(sheet)).toEqual({
      tone: ['loud', 'quiet'],
      active: [false, true],
    })
  })

  test('untyped selector keys inside parts and under conditions count', () => {
    // The types refuse a raw selector key; the runtime (and an untyped caller) accepts it.
    const rules: object = {
      Root: {
        opacity: 0,
        '[tone=loud]': { opacity: 1 },
        '@platform web': { '[size=l]': { opacity: 0.5 } },
      },
    }
    const sheet = ui.stylesheet(rules as never)
    expect(stylesheetVariants(sheet)).toEqual({
      tone: ['loud'],
      size: ['l'],
    })
  })

  test('a selector an .extend() layer removes with null does not count', () => {
    const sheet = base.variants(($: Variants<Mods>) => ({
      [$.tone('quiet')]: { Root: { opacity: 0.5 } },
      [$.tone('loud')]: { Root: { opacity: 1 } },
    }))
    const removal: object = { '[tone=loud]': null }
    expect(stylesheetVariants(sheet.extend(removal as never))).toEqual({
      tone: ['quiet'],
    })
  })

  test('the result is frozen and reused', () => {
    const sheet = base.variants(($: Variants<Mods>) => ({
      [$.tone('quiet')]: { Root: { opacity: 0.5 } },
    }))
    const variants = stylesheetVariants(sheet)
    expect(stylesheetVariants(sheet)).toBe(variants)
    expect(Object.isFrozen(variants)).toBe(true)
    expect(Object.isFrozen(variants.tone)).toBe(true)
  })

  test('a value that is not a stylesheet is refused', () => {
    expect(() => stylesheetVariants({})).toThrow(/expected a stylesheet/)
  })
})

describe('stylesheetVariantCombinations', () => {
  const sheet = base.variants(($: Variants<Mods>) => ({
    [$.tone('quiet')]: { Root: { opacity: 0.5 } },
    [$.tone('loud')]: { Root: { opacity: 1 } },
    [$.active(true)]: { Label: { opacity: 1 } },
  }))

  test('every combination, each axis also left unset', () => {
    expect(stylesheetVariantCombinations(sheet)).toEqual([
      {},
      { active: false },
      { active: true },
      { tone: 'quiet' },
      { tone: 'quiet', active: false },
      { tone: 'quiet', active: true },
      { tone: 'loud' },
      { tone: 'loud', active: false },
      { tone: 'loud', active: true },
    ])
    expect(stylesheetVariantCombinations(base)).toEqual([{}])
  })

  test('each combination resolves through a renderer', () => {
    const native = createNativeRenderer(ui, { tokens: {} })
    const opacities = stylesheetVariantCombinations(sheet).map(
      // A combination leaves axes unset, which this sheet's types (no defaults) require.
      (variants) =>
        native.resolve(sheet, {
          variants: variants as Required<typeof variants>,
        }).Root.style['opacity'],
    )
    expect(new Set(opacities)).toEqual(new Set([0, 0.5, 1]))
  })

  test('past the cap it throws, naming the sheet and its axes', () => {
    expect(() => stylesheetVariantCombinations(sheet, { cap: 8 })).toThrow(
      'Toned: the stylesheet with parts Root, Label has 9 variant combinations, more than the cap of 8 (tone: 3, active: 3). Pass a larger cap, or enumerate fewer axes.',
    )
    expect(() =>
      stylesheetVariantCombinations(sheet, { cap: 8, name: 'button.ts card' }),
    ).toThrow(/^Toned: button\.ts card has 9 variant combinations/)
    expect(stylesheetVariantCombinations(sheet, { cap: 9 })).toHaveLength(9)
  })
})
