/**
 * `withTargets(system, targets)`: one system, seen by the code that only one
 * renderer reads. A web app sharing a web-and-native system writes plain CSS
 * in `$style` through the view, while its sheets stay the system's own: the
 * same renderer, the same build output and the same class names.
 */
import { describe, expect, test } from 'vitest'

import { buildStyles } from '../build/index.ts'
import {
  createNativeRenderer,
  createPdfRenderer,
  createWebRenderer,
} from '../server/index.ts'
import { defineSystem, defineToken, withTargets } from './index.ts'

const gap = defineToken({
  values: [0, 1] as const,
  resolve: (value) => ({ gap: value * 4 }),
})
const conditions = { media: { md: 768 } } as const

describe('withTargets', () => {
  const shared = defineSystem({ id: 'shared', tokens: { gap }, conditions })
  const web = withTargets(shared, ['web'])

  test('the view declares the targets, frozen, and keeps the system', () => {
    expect(web.targets).toEqual(['web'])
    expect(Object.isFrozen(web.targets)).toBe(true)
    expect(Object.isFrozen(web)).toBe(true)
    expect(web.id).toBe('shared')
    expect(web.tokens).toBe(shared.tokens)
    expect(web.system).toBe(shared.system)
    expect(web.q).toBe(shared.q)
    expect(shared.targets).toBeUndefined()
  })

  test("a view's sheet renders through the system's renderer, with the same classes", () => {
    const manifest = buildStyles(shared, { sheets: [] }).manifest
    const renderer = createWebRenderer(shared, { manifest })
    const rules = {
      Root: { gap: 1, '@md': { gap: 0 } },
    } as const
    const throughView = web.stylesheet({
      Root: { ...rules.Root, $style: { cursor: 'pointer' } },
    })
    const throughSystem = shared.stylesheet({
      Root: {
        ...rules.Root,
        '@platform web': { $style: { cursor: 'pointer' } },
      },
    })
    expect(renderer.resolve(throughView)).toEqual(
      renderer.resolve(throughSystem),
    )
    expect(renderer.resolve(throughView).Root?.className).toContain('shared--')
  })

  test('a renderer made from the view takes the sheets of either', () => {
    const manifest = buildStyles(web, { sheets: [] }).manifest
    const renderer = createWebRenderer(web, { manifest })
    const sheet = shared.stylesheet({ Root: { gap: 1 } })
    expect(() => renderer.resolve(sheet)).not.toThrow()
    expect(() =>
      renderer.resolve(web.stylesheet({ Root: { gap: 0 } })),
    ).not.toThrow()
  })

  test('the view builds the same output as the system', () => {
    expect(buildStyles(web, { sheets: [] }).css).toBe(
      buildStyles(shared, { sheets: [] }).css,
    )
    expect(buildStyles(web, { sheets: [] }).manifest).toEqual(
      buildStyles(shared, { sheets: [] }).manifest,
    )
  })

  test('a renderer for a target the view did not declare throws', () => {
    expect(() => createNativeRenderer(web, { tokens: {} })).toThrow(
      "Toned renderer: system 'shared' declares targets 'web', not 'native'",
    )
    expect(() => createNativeRenderer(shared, { tokens: {} })).not.toThrow()
  })

  test('a legacy system (no id) has views too', () => {
    const legacy = defineSystem({ gap }, conditions)
    const view = withTargets(legacy, ['web'])
    const manifest = buildStyles(legacy, { sheets: [] }).manifest
    const renderer = createWebRenderer(legacy, { manifest })
    expect(() =>
      renderer.resolve(
        view.stylesheet({ Root: { $style: { cursor: 'pointer' } } }),
      ),
    ).not.toThrow()
    expect(buildStyles(view, { sheets: [] }).css).toBe(
      buildStyles(legacy, { sheets: [] }).css,
    )
  })

  test('a view of a view narrows again; a view of a targeted system stays inside it', () => {
    const both = defineSystem({
      id: 'both',
      targets: ['web', 'native'],
      tokens: { gap },
    })
    expect(withTargets(both, ['native']).targets).toEqual(['native'])
    expect(withTargets(withTargets(both, ['web']), ['web']).targets).toEqual([
      'web',
    ])
    expect(() =>
      // @ts-expect-error pdf is not one of the system's targets
      withTargets(both, ['pdf']),
    ).toThrow(
      "Toned: withTargets: 'pdf' is not a target of system 'both', which declares 'web', 'native'",
    )
    expect(() =>
      createPdfRenderer(withTargets(both, ['web']), { tokens: {} }),
    ).toThrow("not 'pdf'")
  })

  test('targets must be known, distinct and non-empty', () => {
    // @ts-expect-error ios is not a target
    expect(() => withTargets(shared, ['ios'])).toThrow(
      "Toned: unknown target 'ios'",
    )
    expect(() => withTargets(shared, ['web', 'web'])).toThrow(
      "Toned: target 'web' is declared twice",
    )
    expect(() => withTargets(shared, [])).toThrow('Toned: targets is empty')
  })
})
