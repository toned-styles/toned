/**
 * `defineSystem({ targets })`: the renderers a system is rendered by. A
 * renderer for a target the system did not declare throws, naming the
 * declared targets; a system without `targets` renders everywhere, as before.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import {
  createInlineRenderer,
  createNativeRenderer,
  createPdfRenderer,
  createWebRenderer,
} from '../server/index.ts'
import { defineSystem, defineToken } from './index.ts'

const gap = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ gap: value * 4 }),
})

describe('system targets', () => {
  const web = defineSystem({
    id: 'web-only',
    targets: ['web'],
    tokens: { gap },
  })

  test('the declared targets are on the system, frozen', () => {
    expect(web.targets).toEqual(['web'])
    expect(Object.isFrozen(web.targets)).toBe(true)
  })

  test('a declared target renders', () => {
    const manifest = buildStyles(web, { sheets: [] }).manifest
    expect(() => createWebRenderer(web, { manifest })).not.toThrow()
  })

  test('an undeclared target throws, naming the declared targets', () => {
    expect(() => createNativeRenderer(web, { tokens: {} })).toThrow(
      "Toned renderer: system 'web-only' declares targets 'web', not 'native': add 'native' to defineSystem({ targets }) to render it",
    )
    expect(() => createInlineRenderer(web, { tokens: {} })).toThrow(
      "not 'email'",
    )
    expect(() => createPdfRenderer(web, { tokens: {} })).toThrow("not 'pdf'")
  })

  test('without targets every renderer works, as before', () => {
    const open = defineSystem({ id: 'open', tokens: { gap } })
    expect(open.targets).toBeUndefined()
    expect(() => createNativeRenderer(open, { tokens: {} })).not.toThrow()
    expect(() => createPdfRenderer(open, { tokens: {} })).not.toThrow()
  })

  test('targets must be known, distinct and non-empty', () => {
    expect(() =>
      // @ts-expect-error ios is not a target
      defineSystem({ id: 'bad', targets: ['ios'], tokens: { gap } }),
    ).toThrow(
      "Toned: unknown target 'ios'; targets are 'web', 'native', 'email', 'pdf', 'tailwind'",
    )
    expect(() =>
      defineSystem({ id: 'bad', targets: ['web', 'web'], tokens: { gap } }),
    ).toThrow("Toned: target 'web' is declared twice")
    expect(() =>
      defineSystem({ id: 'bad', targets: [], tokens: { gap } }),
    ).toThrow('Toned: targets is empty')
  })
})
