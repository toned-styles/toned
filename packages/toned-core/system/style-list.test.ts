/**
 * `$style` takes a list: entries merge in order, the last wins, falsy entries
 * are skipped and `null` unsets a property. The list is folded once, when the
 * declaration is normalized, so plans see one style object as before.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import { createNativeRenderer, createWebRenderer } from '../server/index.ts'
import { defineSystem, defineToken } from './index.ts'
import { normalizeDeclarations } from './normalize.ts'

const gap = defineToken({
  values: [0, 1, 2] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
const ui = defineSystem({
  id: 'lists',
  tokens: { gap },
  conditions: { media: { md: 768 } },
})

const focusRing = { outlineWidth: 2, outlineStyle: 'solid' } as const
const still = { transitionDuration: '0s' } as const
const dim = false as boolean

const web = (sheet: object) =>
  createWebRenderer(ui, {
    manifest: buildStyles(ui, { sheets: [sheet as never] }).manifest,
  }).resolve(sheet as never) as Record<string, { style: object }>

describe('$style lists', () => {
  test('entries merge in order and the last one wins', () => {
    const sheet = ui.stylesheet({
      Root: {
        '@platform web': {
          $style: [focusRing, still, { outlineWidth: 4, maxWidth: '42rem' }],
        },
      },
    })
    expect(web(sheet)['Root']!.style).toEqual({
      outlineWidth: 4,
      outlineStyle: 'solid',
      transitionDuration: '0s',
      maxWidth: '42rem',
    })
  })

  test('falsy entries are skipped, so `cond && fragment` works', () => {
    const sheet = ui.stylesheet({
      Root: { $style: [{ opacity: 0.5 }, dim && { opacity: 1 }, null] },
    })
    expect(
      createNativeRenderer(ui, { tokens: {} }).resolve(sheet).Root.style,
    ).toEqual({ opacity: 0.5 })
  })

  test('null unsets a property an earlier entry set', () => {
    const sheet = ui.stylesheet({
      Root: { $style: [{ opacity: 0.5, zIndex: 2 }, { zIndex: null }] },
    })
    expect(
      createNativeRenderer(ui, { tokens: {} }).resolve(sheet).Root.style,
    ).toEqual({ opacity: 0.5 })
  })

  test('in extend, a null with nothing earlier in the list removes the inherited property', () => {
    const base = ui.stylesheet({
      Root: { $style: { opacity: 0.5, zIndex: 2 } },
    })
    const derived = base.extend({ Root: { $style: [{ zIndex: null }] } })
    expect(
      createNativeRenderer(ui, { tokens: {} }).resolve(derived).Root.style,
    ).toEqual({ opacity: 0.5 })
  })

  test('lists work inside conditions and platform blocks', () => {
    const normalized = normalizeDeclarations({
      Root: {
        '@md': { $style: [{ opacity: 0.5 }, { zIndex: 1 }] },
        '@platform native': { $style: [{ opacity: 1 }, false] },
      },
    })
    expect(normalized).toEqual({
      Root: {
        '@md': { style: { opacity: 0.5, zIndex: 1 } },
        '@platform.native': { style: { opacity: 1 } },
      },
    })
  })

  test('a list is folded once, into a frozen object', () => {
    const list = [{ opacity: 0.5 }, { zIndex: 1 }]
    const normalized = normalizeDeclarations({
      Root: { $style: list },
    }) as unknown as { Root: { style: object } }
    expect(Array.isArray(normalized.Root.style)).toBe(false)
    expect(Object.isFrozen(normalized.Root.style)).toBe(true)
    expect(list).toEqual([{ opacity: 0.5 }, { zIndex: 1 }])
  })

  test('a list entry that is not a style object is refused', () => {
    expect(() =>
      normalizeDeclarations({ Root: { $style: [{ opacity: 1 }, 'bold'] } }),
    ).toThrow(/\$style list entry 1 .*style object/)
  })
})

describe('platform keys', () => {
  test("q.platform returns the canonical '@platform web' spelling", () => {
    expect(ui.q.platform('web')).toBe('@platform web')
    expect(ui.q.platform('native')).toBe('@platform native')
  })

  test("the '@platform.web' alias still resolves", () => {
    const sheet = ui.stylesheet({
      Root: { '@platform.native': { $style: { opacity: 0.5 } } },
    })
    expect(
      createNativeRenderer(ui, { tokens: {} }).resolve(sheet).Root.style,
    ).toEqual({ opacity: 0.5 })
  })

  test('both spellings in one part are refused, naming the canonical one', () => {
    expect(() =>
      normalizeDeclarations({
        Root: {
          '@platform web': { $style: { cursor: 'pointer' } },
          '@platform.web': { $style: { userSelect: 'none' } },
        },
      }),
    ).toThrow(
      "'@platform web' and its alias '@platform.web' are both written here",
    )
  })
})
