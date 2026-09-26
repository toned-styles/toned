import type { Variants } from '../types/index.ts'
import { describe, expect, it } from 'vitest'
import { buildStyles } from '../build/index.ts'
import { cssTestValue } from '../backends/css/test-values.test.helpers.ts'
import { compilePlan, foldOperations, resolvePlan } from '../core/plan.ts'
import { dp } from '../core/values.ts'
import { StyleMatcher } from '../stylesheet/StyleMatcher.ts'
import { getStylesheetPlan } from '../stylesheet/plans.ts'
import { relationFactKey } from '../stylesheet/relations.ts'
import { overrideSheet } from '../stylesheet/overrideSheet.ts'
import { collectAdHocConditions } from '../utils/conditions.ts'
import { defineSystem, defineToken } from './definers.ts'
import { createQueries } from './queries.ts'

const ui = defineSystem({
  id: 'computed-query-test',
  tokens: {
    gap: defineToken({
      values: [0, 1, 2, 3, 4],
      properties: ['gap'],
      resolve: (value) => ({ gap: value }),
    }),
  },
  conditions: {
    media: { wide: 800 },
    containers: { card: { wide: 300 } },
    states: { open: '[data-open]' },
  },
})
const native = (sheet: object, facts: Record<string, unknown>, part = 'Root') =>
  foldOperations(
    resolvePlan(compilePlan(ui, sheet, 'native'), ui, {}, facts)[part] ?? [],
  ).style

describe('computed query keys', () => {
  it('colocates local states with media/containers and agrees with the matcher across a truth table', () => {
    const sheet = ui.stylesheet((q) => ({
      Root: {
        gap: 0,
        [q.all(
          q.media('wide'),
          q.any(q.state('hover'), q.container('card', 'wide')),
        )]: { gap: 1 },
      },
    }))
    const matcher = new StyleMatcher(getStylesheetPlan(sheet).rules, {
      sourceOrder: true,
      platform: 'native',
    })
    for (const media of [false, true])
      for (const hover of [false, true])
        for (const container of [false, true]) {
          const facts = {
            '@wide': media,
            'Root:hover': hover,
            '@card/wide': container,
          }
          const expected = media && (hover || container) ? 1 : 0
          expect(native(sheet, facts)['gap']).toBe(expected)
          expect(matcher.match(facts).Root['gap']).toBe(expected)
        }
  })

  it('intersects nested root/local predicates and enclosing variant conditions', () => {
    const sheet = ui
      .stylesheet({ Root: { gap: 0 } })
      .variants(($: Variants<{ size: 's' | 'l' }>, q) => ({
        [$.size('s')]: {
          Root: {
            [q.all(q.media('wide'))]: {
              gap: 1,
              [q.not(q.state('hover'))]: { gap: 2 },
            },
          },
        },
        [q.all($.size('l'), q.media('wide'))]: { Root: { gap: 3 } },
      }))
    expect(native(sheet, { size: 's', '@wide': true })['gap']).toBe(2)
    expect(
      native(sheet, { size: 's', '@wide': true, 'Root:hover': true })['gap'],
    ).toBe(1)
    expect(native(sheet, { size: 's' })['gap']).toBe(0)
    expect(native(sheet, { size: 'l', '@wide': true })['gap']).toBe(3)
  })

  it('reuses a selector as an authored key and across compound queries', () => {
    const sheet = ui
      .stylesheet({ Root: { gap: 0 } })
      .variants(($: Variants<{ size: 's' | 'l' }>, q) => {
        const small = $.size('s')
        return {
          [small]: { Root: { gap: 1 } },
          [q.all(small, q.platform('native'))]: { Root: { gap: 2 } },
          [q.any(small, q.media('wide'))]: {
            Root: { $style: { opacity: 0.5 } },
          },
          [q.not(small)]: { Root: { gap: 3 } },
        }
      })
    expect(native(sheet, { size: 's' })).toEqual({ gap: 2, opacity: 0.5 })
    expect(native(sheet, { size: 'l' })).toEqual({ gap: 3 })
    expect(native(sheet, { size: 'l', '@wide': true })).toEqual({
      gap: 3,
      opacity: 0.5,
    })
  })

  it('does not consume an override selector when its queries precede the authored key', () => {
    const base = ui
      .stylesheet({ Root: { gap: 0 } })
      .variants(($: Variants<{ size: 's' | 'l' }>) => ({
        [$.size('s')]: { Root: { gap: 1 } },
      }))
    const sheet = overrideSheet(base, {}, ($, q) => {
      const small = $.size('s')
      return {
        [q.all(small, q.platform('native'))]: { Root: { gap: 2 } },
        [small]: { Root: { gap: 3 } },
        [q.any(small, q.media('wide'))]: {
          Root: { $style: { opacity: 0.75 } },
        },
        [q.not(small)]: { Root: { gap: 4 } },
      }
    })
    expect(native(sheet, { size: 's' })).toEqual({ gap: 3, opacity: 0.75 })
    expect(native(sheet, { size: 'l' })).toEqual({ gap: 4 })
    expect(native(sheet, { size: 'l', '@wide': true })).toEqual({
      gap: 4,
      opacity: 0.75,
    })
    expect(native(base, { size: 's' })).toEqual({ gap: 1 })
  })

  it('still rejects duplicate authored selector keys after query reuse', () => {
    expect(() =>
      ui.stylesheet({ Root: {} }).variants(($: Variants<{ size: 's' }>, q) => {
        const small = $.size('s')
        return {
          [q.all(small, q.platform('native'))]: { Root: { gap: 1 } },
          [small]: { Root: { gap: 2 } },
          [$.size('s')]: { Root: { gap: 3 } },
        }
      }),
    ).toThrow('Duplicate Toned variant selector: [size=s]')
  })

  it('registers relations under computed keys and keeps overrides authoritative', () => {
    const sheet = ui.stylesheet((q) => ({
      Root: { gap: 0 },
      Label: { gap: 0 },
      [q.part('Root').has('Label', 'open')]: { Root: { gap: 2 } },
    }))
    const fact = relationFactKey({
      scope: 'descendant',
      sourcePart: 'Root',
      part: 'Label',
      state: 'open',
    })
    expect(native(sheet, {})['gap']).toBe(0)
    expect(native(sheet, { [fact]: true })['gap']).toBe(2)
    expect(
      native(overrideSheet(sheet, { Root: { gap: 4 } }), { [fact]: true })[
        'gap'
      ],
    ).toBe(4)
    const matcher = new StyleMatcher(getStylesheetPlan(sheet).rules, {
      sourceOrder: true,
    })
    expect(matcher.interactions['Label']).toEqual({ ':open': true })
  })

  it('retains ad-hoc widths from deeply nested computed keys in emitted assets', () => {
    const sheet = ui.stylesheet((q) => ({
      Root: {
        [q.all(q.media(dp(701)), q.container('card', dp(303)))]: { gap: 1 },
      },
    }))
    expect(buildStyles(ui, { sheets: [sheet] }).manifest.conditions).toEqual([
      '>=701px',
      'card/>=303px',
    ])
    const query = ui.q.all(ui.q.media(dp(702)), ui.q.container('card', dp(304)))
    let rules: Record<string, unknown> = { [query]: {} }
    for (let i = 0; i < 10; i++) rules = { Root: rules }
    const conditions = new Set<string>()
    collectAdHocConditions(rules, conditions)
    expect([...conditions]).toEqual(['>=702px', 'card/>=304px'])
  })

  it('rejects malformed expressions and unknown state/media/part references at authoring', () => {
    const q = createQueries<any>()
    for (const key of [
      '@query all:2|',
      '@query unknown|',
      q.all('@missing' as never),
      q.all('Root:missing' as never),
      q.part('Root').has('Label', 'missing' as never),
    ]) {
      expect(() =>
        ui.stylesheet({
          Root: {},
          Label: {},
          [key]: { Root: { gap: 1 } },
        } as never),
      ).toThrow()
    }
    expect(() =>
      ui.stylesheet({
        Root: {},
        [q.all(q.state('hover'))]: { Root: { gap: 1 } },
      } as never),
    ).toThrow('sheet-level')
    expect(() =>
      ui.stylesheet({
        Root: {},
        [q.part('Root').has('Missing', 'hover')]: { Root: { gap: 1 } },
      } as never),
    ).toThrow('Unknown relation part')
  })
})

it('preserves underscores inside encoded queries at the direct-exec spelling boundary', () => {
  const legacy = defineSystem(
    {
      gap: defineToken({
        values: [0, 4],
        resolve: (value) => ({ gap: value }),
      }),
    },
    { breakpoints: { __breakpoints: { desk_top: 800 } } },
  )
  const key = legacy.q.all(legacy.q.media('desk_top'), legacy.q.state('hover'))
  const result = legacy.exec({ tokens: {} }, {
    gap: 0,
    [key]: { gap: 4 },
  } as never).style as Record<string, unknown>
  for (const media of [false, true])
    for (const hover of [false, true]) {
      expect(
        cssTestValue(result, 'gap', {
          '--media-desk_top': media,
          '--toned_hover': hover,
        }),
      ).toBe(media && hover ? '4px' : '0px')
    }
})

it('retains authored query provenance when a platform expression simplifies to true', () => {
  const sheet = ui.stylesheet((q) => ({
    Root: {
      gap: 0,
      [q.any(q.platform('native'), q.state('hover'))]: { gap: 1 },
    },
  }))
  const plan = compilePlan(ui, sheet, 'native')
  expect(
    plan.operations.find((operation) => operation.value === 1)?.origin.query,
  ).toBe(true)
  expect(native(sheet, {})['gap']).toBe(1)
})
